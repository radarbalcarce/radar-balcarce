// Cómo se decide qué se publica, en qué sección y con qué prioridad.
//
// Esta es la parte editorial: el semáforo, el puntaje y la limpieza del
// texto. Son las reglas que hacen que el sitio se actualice solo sin que
// nadie mire, así que un error acá se publica solo también.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paraPruebas, aplicarPopularidad } from '../ingesta/ingesta.mjs';
import { decisionHumana } from '../ingesta/utiles.mjs';

const {
  normalizar, sentenciar, esDeBalcarce, figuraQueNombra,
  clasificar, semaforo, limpiarCopete, relevancia, idDe, parsearScrape, mediosMinimosDe,
} = paraPruebas;

/** Una nota mínima, para no repetir diez campos en cada prueba. */
function nota(extra = {}) {
  return {
    titulo: '', cuerpo: '', categorias: [], peso: 20, alcance: 'local',
    fecha: new Date(), imagen: null, ...extra,
  };
}

// ---------------------------------------------------------------- el texto

test('normalizar saca tildes, mayúsculas y puntuación', () => {
  assert.equal(normalizar('Automovilismo: el TC en Balcarce'), 'automovilismo el tc en balcarce');
  assert.equal(normalizar('ÑOÑO, ¿sí?'), 'nono si');
});

test('un título en mayúsculas se pasa a redacción normal', () => {
  // Los medios locales publican así, y en la portada quedaba gritando.
  const t = sentenciar('EL CONCEJO APROBO EL PRESUPUESTO 2027', 'El Concejo Deliberante aprobó...');
  assert.equal(t, 'El Concejo aprobo el presupuesto 2027');
});

test('los nombres propios del cuerpo sobreviven al cambio', () => {
  const t = sentenciar('GANO FERROVIARIOS EN BALCARCE', 'Ferroviarios ganó en Balcarce el domingo');
  assert.ok(t.includes('Ferroviarios'), t);
  assert.ok(t.includes('Balcarce'), t);
});

test('un título ya bien escrito no se toca', () => {
  const original = 'El Concejo aprobó el presupuesto';
  assert.equal(sentenciar(original, ''), original);
});

test('el copete no repite el título', () => {
  // Muchos feeds mandan el título otra vez como descripción. Publicarlo
  // así es ocupar tres renglones para no decir nada nuevo.
  const titulo = 'El Concejo aprobó el presupuesto 2027';
  assert.equal(limpiarCopete(titulo, titulo, 'La Vanguardia'), '');
});

test('el copete pierde la firma del medio', () => {
  const c = limpiarCopete(
    'La sesión duró cuatro horas y terminó con doce votos a favor del oficialismo local | Diario La Vanguardia',
    'El Concejo aprobó el presupuesto',
    'Diario La Vanguardia',
  );
  assert.ok(!c.includes('La Vanguardia'), c);
  assert.ok(c.startsWith('La sesión duró cuatro horas'));
});

test('el "seguir leyendo" del final no es parte de la noticia', () => {
  // Pasó el 22/09: una nota de Radio Gabal terminaba el copete en "Leer
  // más…", que es el link de la fuente para ir a su propia nota, no algo
  // que haya dicho la fuente sobre el tema.
  const c = limpiarCopete(
    'El integrante de la Asociación Autódromo se emocionó al recordar al reconocido constructor. Leer más…',
    'Mario Alberghini recordó a Tulio Crespi',
    'Radio Gabal',
  );
  assert.ok(!/leer\s*m[aá]s/i.test(c), c);
  assert.ok(c.endsWith('constructor.'), c);
});

test('un copete demasiado corto se descarta', () => {
  assert.equal(limpiarCopete('Seguí leyendo', 'Un título cualquiera', 'El Diario'), '');
});

test('un copete largo se corta en una palabra entera, no a la mitad', () => {
  // Pasó el 22/09: el corte a los 280 caracteres caía en plena palabra o en
  // plena frase ("...pasión por los"), sin ningún "…" que avisara que
  // seguía. Se veía como una nota rota, no como un resumen.
  const cuerpo = `${'Una palabra '.repeat(30)}más para completar el texto original de la fuente.`;
  const c = limpiarCopete(cuerpo, 'Un título cualquiera', 'El Diario');
  assert.ok(c.length <= 281, c.length); // 280 + el "…"
  assert.ok(c.endsWith('…'), c);
  assert.ok(!/\bpalabr$/.test(c.slice(0, -1)), 'no corta una palabra a la mitad');
});

// ------------------------------------------------------------ las secciones

test('lo que pasa en Balcarce se reconoce aunque la fuente sea de afuera', () => {
  assert.ok(esDeBalcarce(nota({ alcance: 'provincia', titulo: 'Un vecino de Balcarce ganó el premio' })));
  assert.ok(!esDeBalcarce(nota({ alcance: 'pais', titulo: 'Suba del dólar', cuerpo: 'El mercado cerró en alza' })));
});

test('un medio de afuera que nombra a Balcarce sólo en el texto no hace la nota "de Balcarce" (27/09)', () => {
  // "Este viernes comienza la 58ª Invasión de Pueblos" (Ecos Diarios, de
  // Necochea) nombraba a Balcarce en la lista de localidades y terminó en el
  // podcast como si fuera de acá. Si el hecho es de Balcarce, el medio de
  // afuera lo dice en el título.
  assert.ok(!esDeBalcarce(nota({ alcance: 'region', titulo: 'Este viernes comienza la 58ª Invasión de Pueblos', cuerpo: 'Participan jóvenes de Necochea, Balcarce y Lobería.' })));
  assert.ok(!esDeBalcarce(nota({ alcance: 'pais', titulo: 'Milei prepara anuncios por la suba del riesgo país', cuerpo: 'En Balcarce y en todo el país…' })));
  assert.ok(esDeBalcarce(nota({ alcance: 'region', titulo: 'Werner hizo la pole del TC Pick Up en el autódromo de Balcarce' })));
  assert.ok(esDeBalcarce(nota({ alcance: 'local', titulo: 'Comienza la Invasión de Pueblos' })), 'lo de un medio de acá sigue siendo de acá');
});

test('el automovilismo le gana a deportes', () => {
  // En Balcarce los fierros son sección propia: es la ciudad de Fangio, no
  // un subtema de deportes.
  const n = nota({ titulo: 'El TC corre en Balcarce', seccionFuente: 'Deportes' });
  assert.equal(clasificar(n), 'Automovilismo');
});

test('"goleó" no hace fútbol a una nota de rugby (29/09: Pato Naranja salió en Fútbol y en las redes)', () => {
  const rugby = nota({
    titulo: 'Pato Naranja goleó a Pampas y quedó entre los cuatro mejores',
    cuerpo: 'El equipo de rugby de Campo de Pato superó 99 a 12 a Pampas de Dolores por el Torneo Desarrollo.',
  });
  assert.equal(clasificar(rugby), 'Deportes');
  // Aunque venga de un feed de deportes.
  assert.equal(clasificar({ ...rugby, seccionFuente: 'Deportes' }), 'Deportes');
  // El fútbol de verdad sigue en Fútbol, aunque también nombre a otro deporte.
  const futbol = nota({ titulo: 'Ferroviarios goleó a Unión en la Liga Balcarceña', cuerpo: 'El club también tiene hockey.' });
  assert.equal(clasificar(futbol), 'Fútbol');
  assert.equal(clasificar(nota({ titulo: 'Boca Juniors goleó a Racing Club', cuerpo: 'Tres goles en la Bombonera.' })), 'Fútbol');
  // Y lo que sólo dice "goleó", sin otro deporte, también.
  assert.equal(clasificar(nota({ titulo: 'Alvarado goleó y sigue puntero', cuerpo: 'Ganó 4 a 0 en Mar del Plata.' })), 'Fútbol');
});

test('gana la palabra más específica, no la primera regla de la lista', () => {
  // "La Exposición Rural de Palermo" salió publicada en Cultura porque
  // "exposición" está en esa regla y Cultura se evalúa antes que Agro.
  // Ahora gana "exposición rural", que dice más sobre de qué se trata.
  const campo = nota({
    titulo: 'Reclamos del campo al Gobierno por impuestos',
    cuerpo: 'La Exposición Rural de Palermo cerró con pedidos del sector agropecuario.',
    alcance: 'pais',
  });
  assert.equal(clasificar(campo), 'Agro');
});

test('una exposición que sí es de cultura sigue en cultura', () => {
  const muestra = nota({
    titulo: 'Se inaugura una exposición de fotos en el Museo',
    cuerpo: 'Muestra del fotógrafo local.',
  });
  assert.equal(clasificar(muestra), 'Cultura y agenda');
});

test('"fangio" solo, sin autódromo ni museo, no hace que una nota de otro lado sea "de Balcarce" (27/09)', () => {
  // La misma nota de Necochea: además de caer en la sección equivocada, el
  // "Fangio" del título original la marcaba como esDeBalcarce(), y eso le
  // sacaba el piso y el cupo de afuera y le sumaba puntaje como si fuera
  // local. El piloto de verdad sigue entrando por "autódromo Juan Manuel
  // Fangio" y "museo Fangio".
  assert.ok(!esDeBalcarce(nota({
    alcance: 'region',
    titulo: 'El colectivo espera, el Fangio acelera',
    cuerpo: 'El Concejo evalúa una prórroga para los colectivos.',
  })));
  assert.ok(esDeBalcarce(nota({
    alcance: 'region',
    titulo: 'Vuelve el TC al Autódromo Juan Manuel Fangio',
  })));
});

test('"fangio" de casualidad en una categoría del feed no manda a Automovilismo (27/09)', () => {
  // Pasó el 27/09: una nota de Necochea sobre el transporte público y el gas
  // salió publicada en Automovilismo porque traía "Fangio" como categoría
  // del feed (un juego de palabras del medio de origen, "el Fangio acelera"),
  // sin que el piloto ni las carreras tuvieran nada que ver.
  const n = nota({
    titulo: 'El transporte público y el gas en debate en la región',
    cuerpo: 'El Concejo evalúa una prórroga para los colectivos y el Congreso redujo la Zona Fría del gas.',
    categorias: ['Fangio'],
    alcance: 'region',
  });
  assert.notEqual(clasificar(n), 'Automovilismo');
});

test('"taller" en el cuerpo, hablando de un auto, no manda a Cultura (27/09)', () => {
  // Pasó el 27/09: "antes de visitar el taller mecánico" mandó una nota de
  // Ámbito sobre cómo arreglar una ventanilla a Cultura y agenda, que la
  // publicó sola sin ninguna relación con Balcarce.
  const n = nota({
    titulo: 'Qué revisar cuando la ventanilla eléctrica del auto no sube',
    cuerpo: 'El origen puede estar en el interruptor o el mecanismo interno. Qué revisar antes de visitar el taller mecánico.',
    alcance: 'pais',
  });
  assert.notEqual(clasificar(n), 'Cultura y agenda');
});

test('"rural" sólo en la bajada no manda a Agro una nota de un gremio local (8/10)', () => {
  // Salió en Facebook con la placa "Agro": UATRE abría la inscripción para útiles escolares.
  const n = nota({
    titulo: 'UATRE Balcarce abre la inscripción para útiles escolares',
    copete: 'La seccional local del gremio rural habilitó el registro para entregar guardapolvos a los hijos de los afiliados.',
    local: true,
  });
  assert.notEqual(clasificar(n), 'Agro');
});

test('un medio que cuenta su propia sede y su teléfono no sale solo (regla 142, 8/10)', () => {
  // Desde el 17/10/2026 (regla 199) no espera a nadie: no es una nota de Radar (ingesta/no-es-nota.mjs).
  const n = nota({
    titulo: 'El Diario Balcarce detalla su rol periodístico y sus vías de contacto',
    cuerpo: 'El Diario Balcarce se define como el único medio de la ciudad con edición en papel y formato digital. La sede legal se encuentra en la calle 17.',
    local: true, alcance: 'local',
  });
  const s = semaforo(n, 'Balcarce');
  assert.equal(s.color, 'rojo');
  assert.match(s.motivo, /^no es nota/);
});

test('si la fuente ya viene separada por sección, se le cree', () => {
  const n = nota({ titulo: 'Ganó el equipo local', seccionFuente: 'Deportes' });
  assert.equal(clasificar(n), 'Deportes');
});

test('un apellido suelto no es una figura: la inmobiliaria Etcheverry no es el tenista (27/09)', () => {
  // Pasó el 27/09: "Alejandro Etcheverry Inmobiliaria vende inmueble…", de
  // Ayacucho al Día, entró como si nombrara al tenista y salió en Cultura.
  assert.equal(figuraQueNombra(nota({ titulo: 'Alejandro Etcheverry Inmobiliaria vende inmueble en muy buen estado', alcance: 'region' })), null);
  assert.equal(figuraQueNombra(nota({ titulo: 'La causa de Lázaro Báez vuelve a la Corte', alcance: 'pais' })), null);
  assert.equal(figuraQueNombra(nota({ titulo: 'Tomás Etcheverry avanzó a cuartos en Pekín', alcance: 'pais' })), 'tomás etcheverry');
});

test('reconoce a las figuras argentinas de afuera', () => {
  const n = nota({ titulo: 'Colapinto terminó séptimo en Monza', alcance: 'pais' });
  assert.equal(figuraQueNombra(n), 'colapinto');
  assert.equal(figuraQueNombra(nota({ titulo: 'Suba de tarifas' })), null);
});

// -------------------------------------------------------------- el semáforo

test('un tema sensible nunca sale solo', () => {
  const s = semaforo(nota({ titulo: 'Detuvieron a un hombre por un femicidio' }), 'Balcarce');
  assert.equal(s.color, 'rojo');
  assert.ok(s.motivo.includes('sensible'));
});

test('el semáforo explica siempre por qué', () => {
  // El panel muestra el motivo al lado de cada nota: una decisión sin
  // explicación no se puede discutir ni corregir.
  for (const titulo of ['Ganó Ferroviarios', 'Detuvieron a dos personas', 'Corte de luz en el centro']) {
    const s = semaforo(nota({ titulo }), 'Balcarce');
    assert.ok(s.motivo && s.motivo.length > 3, 'sin motivo: ' + titulo);
    assert.ok(['verde', 'amarillo', 'rojo'].includes(s.color));
  }
});

test('un comunicado oficial sale solo', () => {
  const s = semaforo(nota({ titulo: 'El municipio informa el corte de agua', oficial: true }), 'Servicios');
  assert.equal(s.color, 'verde');
});

// --------------------------------------------------------------- el puntaje

test('lo de Balcarce pesa más que lo de afuera', () => {
  const local = relevancia(nota({ titulo: 'Obras en el Cerro El Triunfo' }), 'Balcarce', 1);
  const afuera = relevancia(nota({ titulo: 'Suba del dólar', alcance: 'pais' }), 'País', 1);
  assert.ok(local > afuera, local + ' debería ganarle a ' + afuera);
});

test('dos medios contando lo mismo suman', () => {
  const n = nota({ titulo: 'Choque en la ruta 226' });
  assert.ok(relevancia(n, 'Balcarce', 2) > relevancia(n, 'Balcarce', 1));
});

test('sin fecha real no se premia la frescura', () => {
  // Si no sabemos cuándo salió, no puede competir con una que sí tiene hora.
  const conHora = nota({ titulo: 'Algo pasó hoy' });
  const sinHora = nota({ titulo: 'Algo pasó hoy', fechaEstimada: true });
  assert.ok(relevancia(conHora, 'Balcarce', 1) > relevancia(sinHora, 'Balcarce', 1));
});

test('el puntaje nunca pasa de 100', () => {
  const todo = nota({
    titulo: 'El TC corre en Balcarce', peso: 90,
    imagen: 'x', textoCompleto: true, nombraBalcarce: true, figura: 'messi',
  });
  assert.ok(relevancia(todo, 'Automovilismo', 4) <= 100);
});


// ------------------------------------------ palabras que engañan al filtro

test('una palabra corta no encuentra otra más larga', () => {
  // "gol" encontraba "golpe", y por eso "Los extremismos dan un doble golpe
  // en Alemania" salió publicada en Deportes. De cuatro letras para abajo se
  // exige la palabra entera.
  const alemania = nota({
    titulo: 'Los extremismos dan un doble golpe en Alemania',
    cuerpo: 'El canciller Merz quedó en una posición delicada.',
    alcance: 'pais',
  });
  assert.notEqual(clasificar(alemania), 'Deportes');
});

test('"partido" en el cuerpo no manda una nota a Deportes', () => {
  // En la provincia de Buenos Aires un partido es un municipio. "Recordaron a
  // Domingo Teruggi a 50 años de su asesinato" hablaba del partido de Lobería
  // y terminó en Deportes.
  const robo = nota({
    titulo: 'Violento robo en la puerta de un kiosco',
    cuerpo: 'Ocurrió en el partido de Lobería, donde se llevaron la recaudación.',
    alcance: 'region',
  });
  assert.equal(clasificar(robo), 'Policiales');
});

test('"partido" en el titular sí cuenta', () => {
  // Cuando la nota es realmente de fútbol, la palabra está en el titular y no
  // hay otra que la delate.
  const boca = nota({
    titulo: 'Boca le ganó a San Lorenzo y llegó a 14 partidos sin perder',
    cuerpo: 'El equipo sigue invicto.',
    alcance: 'pais',
  });
  // Desde el 27/09 el fútbol tiene sección propia.
  assert.equal(clasificar(boca), 'Fútbol');
});

test('un descenso de temperatura no es un descenso de categoría', () => {
  const frio = nota({
    titulo: 'Se desploma la temperatura y vuelve el frío al AMBA',
    cuerpo: 'El ingreso de aire frío provocará un marcado descenso de las temperaturas.',
    alcance: 'pais',
  });
  assert.equal(clasificar(frio), 'Argentina');
});

// ------------------- lo de afuera: cuántos medios lo cuentan (el cruce, 27/09)

test('lo de Balcarce sale solo aunque puntúe poco', () => {
  const local = nota({ titulo: 'Arreglan una vereda en el centro', local: true });
  assert.equal(semaforo(local, 'Balcarce').color, 'verde');
});

test('lo de afuera que cuentan pocos medios espera, por más puntaje que tenga', () => {
  // Hasta el cruce decidía el puntaje. Desde el 27/09, cuántos medios lo
  // cuentan: el puntaje viejo frenaba a Ailín Pérez (9 medios) y dejaba pasar
  // notas de dos.
  const afuera = nota({ titulo: 'Boca derrota a San Lorenzo', alcance: 'pais', local: false });
  const s = semaforo(afuera, 'Fútbol', 2);
  assert.equal(s.color, 'amarillo');
  assert.equal(s.motivo, 'de afuera y poco contada (2 medios; Fútbol pide 3)');
  assert.equal(semaforo(afuera, 'Fútbol', 3).color, 'verde', 'con los medios, el puntaje no frena');
});

test('lo que nombra a una figura argentina pide lo mismo que el resto (desde el 17/10 la figura sólo suma puntaje)', () => {
  const messi = nota({ titulo: 'Messi metió dos goles en Inter Miami', alcance: 'pais', local: false, figura: 'Messi' });
  assert.equal(semaforo(messi, 'Fútbol', 3).color, 'verde');
  assert.equal(semaforo(messi, 'Fútbol', 2).color, 'amarillo');
  assert.equal(semaforo(messi, 'Fútbol', 1).color, 'amarillo', 'nunca con un solo medio');
});

test('el automovilismo pide tres medios, como todos (hasta la regla 260 pedía dos), no un puntaje', () => {
  const f1 = nota({ titulo: 'El complicado arte de frenar en la Fórmula 1', alcance: 'pais', local: false });
  assert.equal(semaforo(f1, 'Automovilismo', 3).color, 'verde');
  assert.equal(semaforo(f1, 'Automovilismo', 2).color, 'amarillo');
  assert.equal(semaforo(f1, 'Automovilismo', 1).color, 'amarillo');
});

test('el piso no pisa a las reglas de arriba', () => {
  // Un tema sensible sigue bloqueado por más puntaje que tenga, y una
  // promoción sigue esperando por más local que sea.
  const grave = nota({ titulo: 'Detuvieron a un hombre por un femicidio', local: true });
  assert.equal(semaforo(grave, 'Balcarce').color, 'rojo');
  // La rifa de una institución es noticia del pueblo desde el 17/10/2026 (regla 199); el sorteo de un comercio, no.
  const rifa = nota({ titulo: 'La rifa de Bomberos ya tiene su sorteo', local: true, alcance: 'local' });
  assert.equal(semaforo(rifa, 'Balcarce').color, 'verde');
  const comercio = nota({ titulo: 'La panadería Del Centro sortea una torta entre sus clientes', local: true, alcance: 'local' });
  assert.equal(semaforo(comercio, 'Balcarce').color, 'amarillo');
});

test('Política y Policiales salen solas cuando no hay nada sensible', () => {
  // Estaban afuera y tenían 38 notas esperando que nadie aprobaba: dos
  // secciones enteras que no existían para el lector. Entraron el 21/09.
  const p = nota({ titulo: 'Se define la interna del oficialismo', local: true });
  assert.equal(semaforo(p, 'Política').color, 'verde');
  const po = nota({ titulo: 'Chocaron dos autos en la ruta', local: true });
  assert.equal(semaforo(po, 'Policiales').color, 'verde');
});

test('en Policiales lo de acá sale (22/10) y queda anotado qué palabra lo habría frenado', () => {
  // Hernán, 22/10/2026: «todas esas de Balcarce no se deben frenar». Lo que cuida a chicos y víctimas es la IA al escribir (no los nombra) y el rojo.
  const casos = [
    'Detuvieron a un hombre por el homicidio de un vecino',
    'Encontraron un cadáver en el arroyo',
    'Un adolescente fue baleado en el barrio Norte',
    'Apuñalaron a un joven a la salida de un boliche',
    'El acusado declaró ante el fiscal',
  ];
  for (const titulo of casos) {
    const s = semaforo(nota({ titulo, local: true }), 'Policiales');
    assert.equal(s.color, 'verde', 'no salió: ' + titulo);
    assert.ok(s.liberadaPor, 'sin anotar la palabra: ' + titulo);
  }
});

test('una muerte de acá sale como noticia, se la llame como se la llame (22/10)', () => {
  // "Murió Mario Torres" salió sola porque el filtro sólo conocía "muerte" y
  // "falleció". Es una necrológica, y las necrológicas no salen sin fuente
  // firmada.
  for (const titulo of ['Murió un reconocido vecino', 'Falleció el histórico dirigente']) {
    const s = semaforo(nota({ titulo, local: true }), 'Balcarce');
    assert.equal(s.color, 'verde', 'no salió: ' + titulo);
  }
});

test('la política de todos los días ya no espera', () => {
  // "intendente", "concejo deliberante", "paro" y "reclamo" frenaban
  // Política entera. Lo que acusa sigue esperando: eso es otra lista.
  for (const titulo of ['El intendente inauguró una obra', 'El Concejo Deliberante aprobó el presupuesto', 'Reclamo de vecinos por el alumbrado']) {
    assert.equal(semaforo(nota({ titulo, local: true }), 'Política').color, 'verde', titulo);
  }
  // 22/10: tampoco espera lo que acusa (la IA lo atribuye y usa el condicional).
  assert.equal(semaforo(nota({ titulo: 'Denuncian al intendente por irregularidades', local: true }), 'Política').color, 'verde');
});

test('Economía sale sola con tres medios y Tecnología, con dos (es un área donde suele haber poco)', () => {
  const e = nota({ titulo: 'El BCRA cerró la semana con reservas en alza', alcance: 'pais', local: false });
  assert.equal(semaforo(e, 'Economía', 3).color, 'verde');
  assert.equal(semaforo(e, 'Economía', 2).color, 'amarillo');
  const t = nota({ titulo: 'Nueva herramienta de inteligencia artificial', alcance: 'pais', local: false });
  assert.equal(semaforo(t, 'Tecnología', 2).color, 'verde');
});

// ------------------------------------ la popularidad de lo de afuera (regla 215, sin cupos)

test('lo de afuera pide 3 medios; 2 en las áreas donde suele haber poco; con uno solo no sale (regla 215)', () => {
  const afuera = (titulo) => nota({ titulo, alcance: 'pais', local: false });
  // Fútbol y Deportes ya no piden 4: piden lo mismo que el resto (3).
  assert.equal(semaforo(afuera('Boca ganó en la Bombonera'), 'Fútbol', 2).color, 'amarillo');
  assert.equal(semaforo(afuera('Boca ganó en la Bombonera'), 'Fútbol', 3).color, 'verde');
  // Economía tampoco es un área chica: pide 3.
  assert.equal(semaforo(afuera('El BCRA subió la tasa'), 'Economía', 2).color, 'amarillo');
  assert.equal(semaforo(afuera('El BCRA subió la tasa'), 'Economía', 3).color, 'verde');
  // Las áreas donde suele haber poco piden 2.
  for (const s of ['Tecnología', 'Ciencia', 'Salud', 'Educación', 'Cultura y agenda']) {
    assert.equal(mediosMinimosDe(s), 2, s);
    assert.equal(semaforo(afuera('Una novedad sólida de la semana'), s, 2).color, 'verde', s);
  }
  // Agro y Automovilismo pedían 2 hasta la regla 260: ahora piden lo mismo que todos.
  for (const s of ['Economía', 'Argentina', 'Política', 'Fútbol', 'Deportes', 'Agro', 'Automovilismo']) assert.equal(mediosMinimosDe(s), 3, s);
  for (const s of ['Economía', 'Tecnología', 'Agro', 'Automovilismo', 'Argentina', 'Política', 'Fútbol', 'Deportes', 'Cultura y agenda']) {
    assert.ok(mediosMinimosDe(s) >= 2, `${s}: de afuera nunca con un solo medio`);
    assert.equal(semaforo(afuera('Una nota con un solo medio'), s, 1).color, 'amarillo', `${s}: un solo medio espera`);
  }
  // Una figura argentina ya no baja el mínimo (era 2): lo cuenta el puntaje, no la puerta.
  assert.equal(semaforo(nota({ titulo: 'Messi vuelve a jugar', alcance: 'pais', local: false, figura: 'messi' }), 'Fútbol', 2).color, 'amarillo');
});

test('sin cupos: treinta notas de afuera de una misma sección con tres medios salen todas, en cualquier orden de puntaje', () => {
  // Hasta el 17/10 un domingo de fútbol dejaba salir 10 y el resto esperaba "por cupo".
  const portada = Array.from({ length: 30 }, (_, i) => ({
    id: 'd' + i, seccion: 'Deportes', semaforo: 'verde', local: false, nombraBalcarce: false, medios: ['A', 'B', 'C'], relevancia: 90 - i,
  }));
  aplicarPopularidad(portada);
  assert.equal(portada.filter((n) => n.semaforo === 'verde').length, 30);
  assert.ok(portada.every((n) => !/cupo/.test(n.motivo ?? '')));
});

test('lo de Balcarce entra todo, ni siquiera el automovilismo tiene tope', () => {
  const portada = [
    ...Array.from({ length: 30 }, (_, i) => ({ id: 'l' + i, seccion: 'Deportes', semaforo: 'verde', local: true, relevancia: 80 })),
    ...Array.from({ length: 30 }, (_, i) => ({ id: 'a' + i, seccion: 'Automovilismo', semaforo: 'verde', local: true, relevancia: 60 })),
  ];
  aplicarPopularidad(portada);
  assert.equal(portada.filter((n) => n.semaforo === 'verde').length, 60);
});

test('el automovilismo de afuera no tiene cupo, pero pide tres medios (25/09: 22 de afuera contra 40 de Balcarce)', () => {
  const portada = Array.from({ length: 30 }, (_, i) => ({
    id: 'a' + i, seccion: 'Automovilismo', semaforo: 'verde', local: false, nombraBalcarce: false, relevancia: 90 - i, medios: i < 25 ? ['Olé', 'TyC Sports', 'Motorsport'] : ['Olé', 'TyC Sports'],
  }));
  aplicarPopularidad(portada);
  const salen = portada.filter((n) => n.semaforo === 'verde');
  assert.equal(salen.length, 25, 'salen todas las que cuentan tres medios; las de menos esperan');
  assert.ok(portada.slice(25).every((n) => n.semaforo === 'amarillo' && /poco contada/.test(n.motivo)));
});

test('cada sección recibe lo que cuentan sus medios: ninguna se queda vacía por el tamaño de otra', () => {
  // La portada del 25/09 a la noche, contada por sección: lo local y lo de afuera. Sin cupos, nada de afuera con los medios que pide se
  // pierde, y lo de acá sigue entero.
  const hoy = {
    Balcarce: { local: 40, afuera: 0 },
    Automovilismo: { local: 23, afuera: 22 },
    Política: { local: 23, afuera: 4 },
    Deportes: { local: 22, afuera: 1 },
    Agro: { local: 12, afuera: 0 },
    Economía: { local: 4, afuera: 6 },
    Tecnología: { local: 1, afuera: 6 },
  };
  const portada = Object.entries(hoy).flatMap(([seccion, { local, afuera }]) => [
    ...Array.from({ length: local }, (_, i) => ({ id: `${seccion}-l${i}`, seccion, semaforo: 'verde', local: true, relevancia: 70 })),
    ...Array.from({ length: afuera }, (_, i) => ({ id: `${seccion}-a${i}`, seccion, semaforo: 'verde', local: false, relevancia: 60 - i, medios: ['A', 'B', 'C'] })),
  ]);
  aplicarPopularidad(portada);
  const por = {};
  for (const n of portada.filter((x) => x.semaforo === 'verde')) por[n.seccion] = (por[n.seccion] ?? 0) + 1;
  for (const [s, { local, afuera }] of Object.entries(hoy)) assert.equal(por[s], local + afuera, `${s}: sale todo (${JSON.stringify(por)})`);
});

test('la popularidad no toca lo que ya esperaba por otro motivo', () => {
  const portada = [{ id: 'x', seccion: 'Deportes', semaforo: 'amarillo', local: false, relevancia: 99, motivo: 'otro', medios: ['A', 'B', 'C', 'D'] }];
  aplicarPopularidad(portada);
  assert.equal(portada[0].motivo, 'otro');
  assert.equal(portada[0].semaforo, 'amarillo');
});

// ------------------------------------------------- lo que no es una nota

test('un bloque de texto de la página no es un titular', () => {
  // El 20/09 salió publicado el "quiénes somos" de El Diario como si fuera
  // una noticia. El titular más largo que publicaron las 24 fuentes ese día
  // tiene 99 caracteres y la mediana es 53.
  const quienesSomos = 'El único diario de Balcarce de aparición en papel y en formato '
    + 'digital. Nuestro compromiso es informar con la verdad, con información chequeada, '
    + 'sin tergiversación y con compromiso con el ciudadano.';
  const html = `<article><h2><a href="/quienes-somos">${quienesSomos}</a></h2></article>`
    + '<article><h2><a href="/nota/1">Inauguran una plaza en el barrio Norte</a></h2></article>';
  const notas = parsearScrape(html, { nombre: 'El Diario', medio: 'El Diario', base: 'https://x.ar', peso: 20 });
  const titulos = notas.map((n) => n.titulo);
  assert.ok(!titulos.some((t) => t.includes('único diario')), titulos.join(' | '));
});

// ------------------------------------------- quién manda sobre el semáforo

test('sólo una persona le gana al semáforo', () => {
  assert.equal(decisionHumana({ estado: 'publicada', por: 'Hernán' }), true);
  assert.equal(decisionHumana({ estado: 'descartada', por: 'Andrés' }), true);
});

test('lo que guardó la máquina no cuenta', () => {
  // Es una foto del semáforo de ese día. Si se la respetara, apretar las
  // reglas no cambiaría nada de lo ya publicado: el 21/09 dejó 29 notas de
  // Deportes por encima del cupo nuevo.
  assert.equal(decisionHumana({ estado: 'automatica', por: 'ia' }), false);
  assert.equal(decisionHumana({ estado: 'automatica' }), false);
  assert.equal(decisionHumana({ estado: 'pendiente', por: null }), false);
});

test('sin decisión, manda el semáforo', () => {
  assert.equal(decisionHumana(undefined), false);
  assert.equal(decisionHumana(null), false);
});

// ------------------------------------------------------------------ el id

test('el mismo título da siempre el mismo id', () => {
  // De esto depende que una nota no se duplique en cada corrida y que las
  // decisiones del panel sigan aplicando después de reiniciar.
  assert.equal(idDe('El Concejo aprobó el presupuesto'), idDe('El Concejo aprobó el presupuesto'));
  assert.notEqual(idDe('Una nota'), idDe('Otra nota'));
});

test('no hay sección Servicios: los cortes y trámites de acá van a Balcarce; lo de afuera, no (27/09)', () => {
  // Hernán, 27/09: "saca la sección servicios, pásalo a Balcarce".
  assert.equal(clasificar(nota({ titulo: 'Corte de luz programado en el barrio Norte' })), 'Balcarce');
  assert.equal(clasificar(nota({ titulo: 'Corte de agua en Lomas de Zamora', alcance: 'pais' })), 'Argentina');
  assert.equal(clasificar(nota({ titulo: 'Anuncian una licitación para el asfalto de Balcarce', alcance: 'region', nombraBalcarce: true })), 'Balcarce');
});

test('el fútbol tiene sección propia; los otros deportes quedan en Deportes; País se llama Argentina (27/09)', () => {
  // Hernán, 27/09: Fútbol aparte y Argentina como sección de verdad.
  assert.equal(clasificar(nota({ titulo: 'Racing vs Boca, por la Copa Argentina: a qué hora juegan', alcance: 'pais' })), 'Fútbol');
  assert.equal(clasificar(nota({ titulo: 'Ferroviarios ganó el clásico de la Liga Balcarceña' })), 'Fútbol');
  // Un feed de deportes trae de todo: lo que es fútbol va a Fútbol, lo demás queda.
  assert.equal(clasificar(nota({ titulo: 'Rosario Central campeón de la Supercopa', seccionFuente: 'Deportes', alcance: 'pais' })), 'Fútbol');
  assert.equal(clasificar(nota({ titulo: 'Ailín Pérez venció a Dumont en la UFC', seccionFuente: 'Deportes', alcance: 'pais' })), 'Deportes');
  assert.equal(clasificar(nota({ titulo: 'Campo de Pato afronta una doble fecha de hockey' })), 'Deportes');
  // "boca" suelta no es Boca.
  assert.notEqual(clasificar(nota({ titulo: 'Limpian una boca de tormenta en el centro' })), 'Fútbol');
});

test('del feed sólo entran enlaces http y https (V2-16, 8/10)', async () => {
  const { parsearFeed } = await import('../ingesta/ingesta.mjs');
  const item = (t, l) => `<item><title>${t}</title><link>${l}</link><pubDate>Thu, 08 Oct 2026 12:00:00 GMT</pubDate><description>x</description></item>`;
  const xml = `<rss><channel>${item('Una nota buena del barrio', 'https://medio.ar/a')}${item('Una nota con enlace raro', 'javascript:alert(1)')}${item('Otra nota con enlace raro', 'data:text/html,x')}</channel></rss>`;
  const notas = parsearFeed(xml, { nombre: 'Medio', medio: 'Medio', peso: 20 });
  assert.deepEqual(notas.map((n) => n.enlace), ['https://medio.ar/a']);
});

test('cuando una fuente no contesta se guarda el motivo real y no sólo "fetch failed" (B1, 8/10)', async () => {
  const { motivoDeFalla } = await import('../ingesta/ingesta.mjs');
  assert.match(motivoDeFalla(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }), 15000), /tiempo agotado \(15 s\)/);
  assert.match(motivoDeFalla(new Error('HTTP 403')), /bloqueo/);
  assert.match(motivoDeFalla(new Error('HTTP 404')), /ya no existe/);
  assert.equal(motivoDeFalla(new Error('HTTP 500')), 'HTTP 500');
  assert.match(motivoDeFalla(Object.assign(new Error('fetch failed'), { cause: { code: 'ENOTFOUND' } })), /DNS/);
  assert.match(motivoDeFalla(Object.assign(new Error('fetch failed'), { cause: { code: 'CERT_HAS_EXPIRED' } })), /certificado/);
  assert.match(motivoDeFalla(Object.assign(new Error('fetch failed'), { cause: { code: 'ECONNRESET' } })), /se cortó/);
  assert.match(motivoDeFalla(new Error('fetch failed')), /fetch failed/);
});

test('una fuente que falló por algo del momento se prueba una vez más; lo que no tiene arreglo, no (B2, 8/10)', async () => {
  const { esReintentable, traerConReintento } = await import('../ingesta/ingesta.mjs');
  for (const si of ['la conexión se cortó', 'el sitio rechazó la conexión', 'HTTP 503', 'HTTP 500', 'HTTP 429 (bloqueo o límite: probar otro User-Agent)']) assert.ok(esReintentable(si), si);
  for (const no of ['tiempo agotado (15 s)', 'HTTP 404 (la dirección ya no existe)', 'HTTP 403 (bloqueo o límite: probar otro User-Agent)', 'el nombre del sitio no se encuentra (DNS)', 'problema de certificado (CERT_HAS_EXPIRED)']) assert.ok(!esReintentable(no), no);
  let llamadas = 0;
  const unaVez = async () => { llamadas += 1; if (llamadas === 1) throw new Error('la conexión se cortó'); return 'ok'; };
  assert.equal(await traerConReintento('x', {}, { traerFn: unaVez, esperar: async () => {} }), 'ok');
  assert.equal(llamadas, 2);
  let n = 0;
  await assert.rejects(traerConReintento('x', {}, { traerFn: async () => { n += 1; throw new Error('HTTP 404'); }, esperar: async () => {} }), /404/);
  assert.equal(n, 1, 'un 404 no se reintenta');
  let m = 0;
  await assert.rejects(traerConReintento('x', {}, { traerFn: async () => { m += 1; throw new Error('HTTP 500'); }, esperar: async () => {} }), /500/);
  assert.equal(m, 2, 'sólo un reintento, nunca más');
});
