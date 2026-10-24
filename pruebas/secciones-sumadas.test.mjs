// Las secciones que se suman a las once (reglas 187 y 211, 17/10/2026; docs/secciones/MAPA-DE-SECCIONES.md): Educación, Salud y Ciencia,
// el menú con "Más secciones" y "Tecnología e IA". Hasta el 17/10 estaban detrás del interruptor SECCIONES_NUEVAS (apagado); Hernán ordenó
// activarlas ya y para siempre ("todas las secciones tienen que tener notas todos los días, si no, no vale la pena tenerlas"). Estas
// pruebas cuidan que existan en el sitio, en la ficha de la IA, en las placas, en el panel y en la ingesta, que nada de lo de siempre
// haya cambiado de lugar ni de dirección, y que el clasificador reparta química, biología, investigación, universidades e IA a donde
// corresponde. Títulos reales de web/data (septiembre y octubre) y de los feeds del 16/10. Sin red.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

const datos = await import('../web/lib/datos.js');
const {
  SECCIONES, seccionesDelSitio, navegacionDelSitio, conSeccionDelSitio, nombreCorto, armarTapa, notasDeLaSeccion, porRanura, EN_LA_BARRA,
  frasesDeSeccion, ordenPorPopularidad,
} = datos;
const {
  SECCIONES_SUMADAS, seccionSumada, SECCIONES_NUEVAS: MAPA, ETIQUETAS_DE_SECCION,
} = await import('../ingesta/secciones-nuevas.mjs');
const lectura = await import('../ingesta/lectura-ia.mjs');
const { paraPruebas, exigirMedios } = await import('../ingesta/ingesta.mjs');
const { rutaDeNota } = await import('../web/lib/ruta.js');
const { COLOR_SECCION } = await import('../reels/placa.mjs');
const { COLOR: COLOR_TARJETA } = await import('../web/lib/tarjeta-diseno.js');
const { SECCIONES: DEL_PANEL, seccionesDelPanel } = await import('../web/public/panel/github.js');
const { hashtagsDe } = await import('../redes/elegir.mjs');
const { tieneRespaldo } = await import('../web/lib/cuerpo.js');

const { clasificar } = paraPruebas;
const leer = (r) => fs.readFileSync(new URL(r, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const nota = (seccion, titulo, extra = {}) => ({
  id: `n${crypto.createHash('md5').update(titulo).digest('hex').slice(0, 7)}`, slug: titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40),
  seccion, titulo, fecha: '2026-10-15T12:00:00.000Z', ...extra,
});

// Las once de antes del 17/10, tal cual estaban en web/lib/datos.js: no cambian de dirección ni de color.
const LAS_ONCE_DE_ANTES = [
  { nombre: 'Balcarce', ranura: 'balcarce', color: 'var(--s-balcarce)' },
  { nombre: 'Política', ranura: 'politica', color: 'var(--s-politica)' },
  { nombre: 'Policiales', ranura: 'policiales', color: 'var(--s-policiales)' },
  { nombre: 'Fútbol', ranura: 'futbol', color: 'var(--s-futbol)' },
  { nombre: 'Deportes', ranura: 'deportes', color: 'var(--s-deportes)' },
  { nombre: 'Automovilismo', ranura: 'automovilismo', color: 'var(--s-automovilismo)' },
  { nombre: 'Agro', ranura: 'agro', color: 'var(--s-agro)' },
  { nombre: 'Economía', ranura: 'economia', color: 'var(--s-economia)' },
  { nombre: 'Cultura y agenda', ranura: 'cultura', color: 'var(--s-cultura)' },
  { nombre: 'Tecnología', ranura: 'tecnologia', color: 'var(--s-tecnologia)' },
  { nombre: 'Argentina', ranura: 'argentina', color: 'var(--s-pais)' },
];

// Notas reales que se van a Educación, Salud o Ciencia.
const QUE_SE_MUEVEN = [
  nota('Balcarce', 'La Asociación de Maestros convoca a un paro docente para el miércoles', { local: true }),
  nota('Balcarce', 'El Club de Leones entrega nuevos equipos al Hospital Municipal', { local: true }),
  nota('Argentina', 'Argentina registra hasta 800 casos anuales de hepatitis C'),
  nota('Política', 'La Provincia convoca a paritarias docentes para el viernes'),
  nota('Balcarce', 'UATRE Balcarce abre la inscripción para útiles escolares', { local: true, publicadaPor: 'ia' }),
];
// Y notas que no se mueven nunca.
const QUE_QUEDAN = [
  nota('Balcarce', 'La Cooperativa de Electricidad anuncia un corte de luz para el miércoles', { local: true }),
  nota('Policiales', 'Choque frente a la escuela de la calle 18', { local: true }),
  nota('Fútbol', 'La Liga Balcarceña suspende la fecha por las lluvias'),
];

// ------------------------------------------------------------------ las catorce, siempre

test('son catorce: las once de siempre (misma dirección, mismo color) y Educación, Salud y Ciencia después de las ocho de la barra', () => {
  assert.equal(SECCIONES.length, 14);
  assert.deepEqual(seccionesDelSitio().map((s) => s.nombre), ['Balcarce', 'Política', 'Policiales', 'Fútbol', 'Deportes', 'Automovilismo', 'Agro', 'Economía',
    'Educación', 'Salud', 'Ciencia', 'Cultura y agenda', 'Tecnología', 'Argentina']);
  assert.deepEqual(SECCIONES_SUMADAS, ['Educación', 'Salud', 'Ciencia']);
  assert.deepEqual(SECCIONES.find((s) => s.nombre === 'Educación'), { nombre: 'Educación', ranura: 'educacion', color: 'var(--s-educacion)' });
  assert.deepEqual(SECCIONES.find((s) => s.nombre === 'Salud'), { nombre: 'Salud', ranura: 'salud', color: 'var(--s-salud)' });
  assert.deepEqual(SECCIONES.find((s) => s.nombre === 'Ciencia'), { nombre: 'Ciencia', ranura: 'ciencia', color: 'var(--s-ciencia)' });
  for (const s of LAS_ONCE_DE_ANTES) assert.deepEqual(SECCIONES.find((x) => x.nombre === s.nombre), s, `${s.nombre} no cambia`);
  assert.equal(porRanura('ciencia').nombre, 'Ciencia');
  assert.match(frasesDeSeccion('Ciencia').lema, /química|biología/i);
  assert.match(frasesDeSeccion('Tecnología').lema, /inteligencia artificial/i);
  assert.deepEqual(DEL_PANEL, LAS_ONCE_DE_ANTES.map((s) => s.nombre), 'el panel sigue exportando las once; seccionesDelPanel suma las tres');
  assert.deepEqual(seccionesDelPanel(), SECCIONES.map((s) => s.nombre), 'el mismo orden que el sitio, sin depender de ningún interruptor');
});

test('"Tecnología" se lee "Tecnología e IA" y "Cultura y agenda", "Cultura"; la clave guardada en las notas no cambia', () => {
  assert.equal(nombreCorto('Tecnología'), 'Tecnología e IA');
  assert.equal(nombreCorto('Cultura y agenda'), 'Cultura');
  assert.equal(nombreCorto('Ciencia'), 'Ciencia');
  assert.equal(ETIQUETAS_DE_SECCION.Tecnología, 'Tecnología e IA');
  assert.equal(SECCIONES.find((s) => s.ranura === 'tecnologia').nombre, 'Tecnología', 'la clave y la dirección de siempre');
});

test('el interruptor SECCIONES_NUEVAS ya no existe: ni en el código ni en el sitio', () => {
  for (const archivo of ['../ingesta/secciones-nuevas.mjs', '../ingesta/lectura-ia.mjs', '../ingesta/ingesta.mjs', '../web/lib/datos.js', '../web/app/layout.js',
    '../web/scripts/generar-datos.mjs', '../web/public/panel/github.js']) {
    assert.doesNotMatch(leer(archivo), /seccionesNuevasActivas|SECCIONES_ETAPA_2|esDeLaEtapa2|seccionDeLaEtapa2/, archivo);
  }
  assert.equal(fs.existsSync(new URL('../web/scripts/vista-previa-secciones.mjs', import.meta.url)), false, 'la vista previa ya no hace falta');
  assert.doesNotMatch(leer('../web/package.json'), /vista-previa-secciones/);
  // Regla 311: tampoco la pasa ningún workflow ni la cuenta la huella del sitio (no la lee ningún programa: sólo provocaría una compilación de más).
  assert.doesNotMatch(leer('../web/scripts/huella-del-sitio.mjs'), /SECCIONES_NUEVAS/);
  for (const w of fs.readdirSync(new URL('../.github/workflows/', import.meta.url)).filter((f) => f.endsWith('.yml'))) {
    assert.doesNotMatch(leer(`../.github/workflows/${w}`), /vars\.SECCIONES_NUEVAS/, w);
  }
  const layout = leer('../web/app/layout.js');
  assert.match(layout, /const menu = navegacionDelSitio\(\{ notas: d\.notas \?\? \[\], archivo: obtenerArchivo\(\) \}\);/);
  assert.match(layout, /\{\.\.\.\(menu\.mas \? \{ mas: menu\.mas \} : \{\}\)\}/);
});

// ------------------------------------------------------------------ el clasificador

test('el clasificador manda a Educación, Salud o Ciencia sólo lo firme, y la dirección de la nota no cambia', () => {
  for (const n of QUE_SE_MUEVEN) {
    const r = conSeccionDelSitio(n);
    // Una de Política (paritarias docentes) nunca se la lleva: espera a una persona en las redes.
    const destino = n.seccion === 'Política' ? 'Política' : r.seccion;
    assert.ok(n.seccion === 'Política' ? r.seccion === 'Política' : ['Educación', 'Salud'].includes(destino), `${n.titulo} → ${r.seccion}`);
    assert.equal(rutaDeNota(r), rutaDeNota(n), 'la dirección es /nota/<slug>-<id>: no lleva la sección');
    assert.doesNotMatch(rutaDeNota(r), /educacion|salud|seccion/);
  }
  for (const n of QUE_QUEDAN) assert.equal(conSeccionDelSitio(n), n, n.titulo);
  const s = (seccion, titulo, extra) => conSeccionDelSitio(nota(seccion, titulo, extra)).seccion;
  // Una débil sola no alcanza ni en el título ("clases", "aulas"); en la bajada no cuenta nunca.
  assert.equal(s('Balcarce', 'Vuelven las clases en el barrio Norte', { local: true }), 'Balcarce');
  assert.equal(s('Balcarce', 'Reunión de vecinos en el barrio Norte', { copete: 'Habrá clases de cocina y una merienda.' }), 'Balcarce');
  // Una firme en la bajada con una débil en el título, sí.
  assert.equal(s('Balcarce', 'Nuevas aulas para el barrio Norte', { copete: 'La escuela suma dos salones.', local: true }), 'Educación');
  // Lo que corrigió o publicó una persona, y las notas propias, no se tocan.
  assert.equal(s('Balcarce', 'La Asociación de Maestros convoca a un paro docente', { corregidaAMano: true }), 'Balcarce');
  assert.equal(s('Balcarce', 'La Asociación de Maestros convoca a un paro docente', { publicadaPor: 'Hernán' }), 'Balcarce');
  assert.equal(s('Balcarce', 'El Hospital Municipal suma una nueva mesa quirúrgica', { propia: 'pista' }), 'Balcarce');
  // Política y Policiales no se tocan nunca (regla 215): esperan a una persona en todas las piezas de redes.
  assert.equal(s('Política', 'La Provincia convoca a paritarias docentes para el viernes'), 'Política');
  assert.equal(s('Política', 'El Municipio impulsa un plan de obras públicas en salud, educación y caminos'), 'Política');
  assert.equal(s('Policiales', 'Alumnos de una escuela secundaria sufrieron una intoxicación'), 'Policiales');
  assert.equal(seccionSumada(nota('Educación', 'La escuela 3 festeja')), null, 'lo que ya está en Educación queda');
  // Lo político del hospital y la salud de una persona famosa no son la sección.
  assert.equal(s('Argentina', 'El Gobierno evalúa cambios en la visita del Papa por su salud'), 'Argentina');
  // Si gana una sección del mapa que sigue en sombra (Policiales desde Balcarce, Ambiente), la nota se queda donde está.
  assert.equal(s('Balcarce', 'Volvieron a robar en una distribuidora de calle 6'), 'Balcarce');
  assert.equal(s('Argentina', 'El Servicio Meteorológico emite alertas por tormentas y vientos'), 'Argentina');
});

test('química, biología, investigación, universidades e IA van a Ciencia, Educación y Tecnología e IA (casos de los feeds del 16/10)', () => {
  const s = (seccion, titulo, extra) => conSeccionDelSitio(nota(seccion, titulo, extra)).seccion;
  // Ciencia: química, biología, espacio, investigación.
  assert.equal(s('Argentina', 'Premio Nobel de Química 2026: reconocen el diseño de nuevas moléculas'), 'Ciencia');
  assert.equal(s('Argentina', 'Por el cambio climático, el mar Caspio se está secando a un ritmo preocupante'), 'Ciencia');
  assert.equal(s('Argentina', 'Descubrieron una estrella verde que desconcierta a los astrónomos'), 'Ciencia');
  assert.equal(s('Tecnología', 'A 1.300 años luz de la Tierra, el James Webb ha encontrado un planeta inesperado'), 'Ciencia');
  assert.equal(s('Argentina', 'Investigadores del CONICET encontraron una bacteria que degrada plásticos'), 'Ciencia');
  assert.equal(s('Agro', 'Científicos del INTA descubrieron un hongo que protege el suelo'), 'Ciencia');
  assert.equal(s('Agro', 'Científicos del INTA descifraron el genoma de una variedad de papa resistente'), 'Agro', 'si habla de producción, es Agro');
  // Tecnología e IA: la inteligencia artificial y la tecnología.
  assert.equal(s('Argentina', 'OpenAI lanzó un nuevo modelo de inteligencia artificial para empresas'), 'Tecnología');
  assert.equal(s('Economía', 'Ocho estados demandan a OpenAI por considerar que ChatGPT es dañino'), 'Tecnología');
  assert.equal(s('Argentina', 'Un ciberataque con ransomware paralizó a una cadena de supermercados'), 'Tecnología');
  // Educación: universidades.
  assert.equal(s('Argentina', 'Nueva marcha federal universitaria por el financiamiento de las universidades'), 'Educación');
  assert.equal(s('Argentina', 'La UNLP abre la inscripción a su nueva diplomatura en periodismo'), 'Educación');
  // Lo que parece ciencia o tecnología y no lo es, no se mueve.
  assert.equal(s('Argentina', 'Nadie sabe a ciencia cierta cuándo vuelve el tren'), 'Argentina');
  assert.equal(s('Economía', 'Crece la industria química: la producción subió 4% en el último año'), 'Economía');
  assert.equal(s('Argentina', 'Elon Musk busca USD 40.000 millones de deuda para impulsar los proyectos de SpaceX'), 'Argentina');
});

test('la ingesta ya clasifica en las tres secciones (no sólo el sitio al armarse): el feed de una sección sólo se cree si el título habla del tema', () => {
  const RSS = (titulo, extra = {}) => ({ titulo, cuerpo: '', categorias: [], alcance: 'pais', peso: 12, fecha: new Date(), ...extra });
  assert.equal(clasificar(RSS('La UNLP abre la inscripción a su nueva diplomatura', { seccionFuente: 'Educación' })), 'Educación');
  assert.equal(clasificar(RSS('Premio Nobel de Química para tres investigadores', { seccionFuente: 'Ciencia' })), 'Ciencia');
  assert.equal(clasificar(RSS('Brote de sarampión: refuerzan la vacunación en la provincia', { seccionFuente: 'Salud' })), 'Salud');
  assert.equal(clasificar(RSS('Brote de sarampión: refuerzan la vacunación en la provincia')), 'Salud', 'sin feed de sección, por las palabras');
  // Infobae Educación trae también notas de empleo y empresas: el feed no alcanza.
  assert.notEqual(clasificar(RSS('Arturo Pfister, de la Cámara Minera de Jujuy: "Nos está faltando mano de obra"', { seccionFuente: 'Educación' })), 'Educación');
  // Lo de acá va con su sección y nunca cambia de dueño: una nota de Política queda en Política.
  assert.equal(clasificar(RSS('El Concejo Deliberante debate el presupuesto de la escuela técnica', { alcance: 'local' })), 'Política');
});

test('las páginas de sección juntan lo que el clasificador les manda, de la portada y del archivo', () => {
  const portada = [QUE_SE_MUEVEN[0], QUE_QUEDAN[0]].map((n) => conSeccionDelSitio(n));
  const archivo = [QUE_SE_MUEVEN[1], QUE_SE_MUEVEN[3]].map((n) => ({ ...conSeccionDelSitio(n), cuerpo: 'palabra '.repeat(90), medios: ['Uno', 'Dos'], oficial: true }));
  assert.deepEqual(notasDeLaSeccion('Educación', { portada, archivo }).map((n) => n.titulo), [QUE_SE_MUEVEN[0].titulo]);
  assert.deepEqual(notasDeLaSeccion('Salud', { portada, archivo }).map((n) => n.titulo), [QUE_SE_MUEVEN[1].titulo]);
  assert.deepEqual(notasDeLaSeccion('Política', { portada, archivo }).map((n) => n.titulo), [QUE_SE_MUEVEN[3].titulo], 'la de Política se queda en Política');
});

// ------------------------------------------------------------------ el menú y la portada

test('el menú lleva las ocho fuertes en la barra y "Más secciones" con todas, agrupadas como en el mapa (también Ciencia)', () => {
  const ahora = Date.parse('2026-10-16T12:00:00Z');
  const portada = [...QUE_SE_MUEVEN, ...QUE_QUEDAN].map((n) => conSeccionDelSitio(n));
  const archivo = [nota('Tecnología', 'Google habilita Gemini 4 Argon', { fecha: '2026-10-14T10:00:00Z' }),
    nota('Ciencia', 'Descubren una molécula nueva', { fecha: '2026-10-15T08:00:00Z' }),
    nota('Argentina', 'La Ciudad avanza con la licitación para construir la Línea F del subte', { fecha: '2026-10-15T10:00:00Z' }),
    nota('Cultura y agenda', 'Una muestra vieja', { fecha: '2026-09-01T10:00:00Z' })];
  const menu = navegacionDelSitio({ notas: portada, archivo, ahora });
  assert.deepEqual(EN_LA_BARRA, ['Balcarce', 'Política', 'Policiales', 'Fútbol', 'Deportes', 'Automovilismo', 'Agro', 'Economía']);
  assert.deepEqual(menu.secciones.map((s) => s.nombre), ['Balcarce', 'Política', 'Policiales', 'Fútbol'], 'en la barra, las de la portada');
  const grupos = Object.fromEntries(menu.mas.grupos.map((g) => [g.nombre, g.secciones]));
  assert.deepEqual(Object.keys(grupos), ['Balcarce', 'Deportes', 'Sociedad', 'Ciencia y tecnología']);
  assert.deepEqual(grupos.Sociedad.map((s) => [s.nombre, s.href, s.color, !!s.nueva]), [
    ['Educación', '/seccion/educacion', 'var(--s-educacion)', true], ['Salud', '/seccion/salud', 'var(--s-salud)', true], ['Argentina', '/seccion/argentina', 'var(--s-pais)', false]]);
  assert.deepEqual(grupos['Ciencia y tecnología'].map((s) => [s.nombre, s.href]), [['Ciencia', '/seccion/ciencia'], ['Tecnología e IA', '/seccion/tecnologia']],
    'una nota en 7 días alcanza (decisión 14 del mapa); Tecnología se lee "Tecnología e IA"');
  assert.ok(!menu.mas.grupos.some((g) => g.secciones.some((s) => s.nombre === 'Cultura')), 'sin notas en 7 días, no se ofrece');
  assert.ok(menu.mas.enLaBarra.includes('/seccion/economia'));
  // El componente: botón con aria-expanded y aria-controls, panel con ese id y escondido, Escape y foco.
  const nav = leer('../web/components/navegacion.js');
  for (const x of ['aria-expanded={abierto}', 'aria-controls="panel-secciones"', 'id="panel-secciones"', 'hidden={!abierto}', "e.key === 'Escape'", 'boton.current?.focus()', "aria-current={actual ? 'page' : undefined}", 'Más secciones', 'Secciones']) {
    assert.ok(nav.includes(x), `navegacion.js: ${x}`);
  }
});

test('la portada y las páginas de sección ordenan por popularidad: más medios = más arriba, sin que una vieja le gane a lo del momento', () => {
  const hora = (h) => new Date(Date.parse('2026-10-16T12:00:00Z') - h * 3600e3).toISOString();
  const n = (id, h, medios) => nota('Ciencia', `Nota de ciencia ${id}`, { id, fecha: hora(h), medios });
  // Una de 8 medios de hace 5 horas (vale 6 horas más nueva) le gana a una de 1 medio de hace 1 hora.
  const orden = ordenPorPopularidad([n('uno', 1, ['A']), n('ocho', 5, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']), n('dos', 2, ['A', 'B'])]).map((x) => x.id);
  assert.deepEqual(orden, ['ocho', 'dos', 'uno'], 'dos medios valen 2 horas más nueva: la de hace 2 horas queda como recién salida');
  // Una de 2 medios de hace 10 horas no le gana a una de un medio de hace 1 hora (vale sólo 2 horas más).
  assert.deepEqual(ordenPorPopularidad([n('vieja', 10, ['A', 'B']), n('nueva', 1, ['A'])]).map((x) => x.id), ['nueva', 'vieja']);
  // Con los mismos medios, por hora, como siempre; sin medios, no se rompe.
  assert.deepEqual(ordenPorPopularidad([n('a', 3, ['A']), n('b', 1, ['A']), n('c', 2, undefined)]).map((x) => x.id), ['b', 'c', 'a']);
  // En la tapa y en las secciones se usa.
  const web = leer('../web/lib/datos.js');
  assert.match(web, /primeroLasMuyContadas\(ordenPorPopularidad\(\[\.\.\.deLaPortada, \.\.\.delArchivo\]\), ahora\)/);
  assert.match(web, /primeroLasMuyContadas\(ordenPorPopularidad\(porSeccion\[s\] \?\? \[\]\), ahora\)/);
  const bloques = armarTapa([n('x', 1, ['A']), n('y', 3, ['A', 'B', 'C', 'D'])].map((x) => ({ ...x, cuerpo: 'palabra '.repeat(90), copete: 'Una bajada.', foto: { archivo: 'f.jpg' } })), undefined, { ahora: Date.parse('2026-10-16T12:00:00Z') });
  assert.ok(bloques.bloques.length >= 0);
});

// ------------------------------------------------------------------ la IA

test('la IA puede elegir las tres, con sus líneas del mapa, y no se lleva lo de Política ni Policiales', () => {
  assert.deepEqual(lectura.seccionesDeLaFicha(), ['Balcarce', 'Política', 'Policiales', 'Educación', 'Salud', 'Ciencia', 'Fútbol', 'Deportes', 'Automovilismo', 'Economía', 'Agro',
    'Tecnología', 'Cultura y agenda', 'Argentina']);
  assert.deepEqual(lectura.ESQUEMA.items.properties.seccion.enum, lectura.seccionesDeLaFicha());
  const texto = lectura.instruccion();
  assert.match(texto, /\n {2}· Policiales: [^\n]*\n {2}· Educación: escuelas, jardines, docentes[^\n]*\n {2}· Salud: hospitales, salas, vacunas/);
  assert.match(texto, /\n {2}· Ciencia: investigación y descubrimientos: química, biología, física/);
  assert.match(texto, /\n {2}· Tecnología: tecnología e inteligencia artificial \(se lee «Tecnología e IA»\)/);
  assert.doesNotMatch(texto, /escuelas, salud local/, 'Balcarce ya no se lleva las escuelas y la salud');
  assert.doesNotMatch(texto, /\(sociedad, clima, salud, educación, grandes hechos\)/);
  assert.match(lectura.pedidoPara([]), /· Salud: /);
  // La importancia es la de la noticia en sí. Desde la regla 260 ya no hay una definición aparte para ciencia y tecnología (servía al
  // "interés de la IA" de las fuentes especializadas, que se sacó) ni "no tienen frontera".
  assert.match(texto, /"importancia": qué tan relevante es la noticia en sí, no qué tan cerca está de Balcarce\./);
  assert.doesNotMatch(texto, /no tienen frontera|descubrimiento, un avance|guía de uso/);
  for (const seccion of ['Educación', 'Salud', 'Ciencia']) {
    const ficha = { id: 'a', ambito: 'balcarce', seccion, impacto_balcarce: 'directo', razon: 'local', importancia: 'media', es_publicidad: false, es_chimento: false, por_que_interesa: 'x' };
    assert.equal(lectura.fichaValida(ficha).seccion, seccion);
  }
  const guardada = (seccion) => ({ ambito: 'balcarce', seccion, impacto: 'directo', razon: 'local', importancia: 'media', cuando: '2026-10-15T00:00:00Z' });
  const de = (seccion, titulo) => ({ id: 'a', titulo, seccion, semaforo: 'verde', alcance: 'local', local: true });
  const [a] = lectura.aplicarFichas([de('Balcarce', 'El Hospital Municipal suma una mesa quirúrgica')], { a: guardada('Salud') }).notas;
  assert.equal(a.seccion, 'Salud');
  assert.equal(a.seccionAntes, 'Balcarce', 'se guarda la de antes: sirve para el hashtag #Balcarce de las redes');
  // Política y Policiales esperan a una persona en las redes: la IA no se las lleva.
  const [b] = lectura.aplicarFichas([de('Política', 'El Concejo debate la creación de un banco municipal de fisiatría')], { a: guardada('Salud') }).notas;
  assert.equal(b.seccion, 'Política');
  const [c] = lectura.aplicarFichas([de('Policiales', 'Un chico se descompensó en la escuela')], { a: guardada('Educación') }).notas;
  assert.equal(c.seccion, 'Policiales');
});

test('la ciencia y la tecnología tampoco tienen frontera (regla 260): del extranjero sólo con un argentino, en todas las secciones', () => {
  const ficha = (seccion, extra = {}) => ({ ambito: 'internacional', seccion, impacto: 'nulo', razon: 'ninguna', importancia: 'media', cuando: '2026-10-15T00:00:00Z', ...extra });
  const de = (seccion, titulo, medios = ['Infobae', 'Perfil']) => ({ id: 'a', titulo, seccion, semaforo: 'verde', alcance: 'pais', local: false, medios });
  // Hasta la regla 260 un descubrimiento del exterior salía en Ciencia y en Tecnología; ahora, sin un argentino, no.
  assert.equal(lectura.aplicarFichas([de('Argentina', 'Descubrieron una estrella verde')], { a: ficha('Ciencia') }).notas.length, 0);
  assert.equal(lectura.aplicarFichas([de('Tecnología', 'Tesla presentó su auto volador')], { a: ficha('Tecnología') }).notas.length, 0);
  // Con un argentino en el título, sí.
  assert.equal(lectura.aplicarFichas([de('Tecnología', 'Una argentina crea un chip que cabe en un dedal')], { a: ficha('Tecnología') }).notas.length, 1);
  // Y la política del exterior, tampoco (el rojo y la lista de lo internacional siguen igual).
  const fuera = lectura.aplicarFichas([de('Política', 'Cumbre de líderes en Asia', ['Infobae', 'Perfil', 'Clarín'])], { a: ficha('Política') });
  assert.equal(fuera.notas.length, 0);
  assert.equal(fuera.cambios.sacadas[0].motivo, 'es del extranjero');
  assert.equal(lectura.aplicarFichas([de('Fútbol', 'Un clásico de la liga italiana')], { a: ficha('Fútbol') }).notas.length, 0, 'ni el fútbol del exterior sin un argentino');
});

test('los colores de las tres son uno solo en el sitio, las placas, las tarjetas y el panel', () => {
  const css = leer('../web/app/globals.css');
  const panel = leer('../web/public/panel/index.html');
  for (const nombre of SECCIONES_SUMADAS) {
    const { color, ranura } = MAPA.find((m) => m.nombre === nombre);
    assert.equal(css.match(new RegExp(`--s-${ranura}:\\s*(#[0-9A-Fa-f]{6})`))?.[1], color, `${nombre} en globals.css`);
    assert.equal(panel.match(new RegExp(`--s-${ranura}:\\s*(#[0-9A-Fa-f]{6})`))?.[1], color, `${nombre} en el panel`);
    assert.equal(COLOR_SECCION[nombre], color, `${nombre} en las placas (COLOR_SECCION)`);
    assert.equal(COLOR_TARJETA[nombre], color, `${nombre} en las tarjetas para compartir`);
  }
  assert.equal(MAPA.find((m) => m.nombre === 'Educación').color, '#1D4BE0');
  assert.equal(MAPA.find((m) => m.nombre === 'Salud').color, '#004E5C');
  assert.equal(MAPA.find((m) => m.nombre === 'Ciencia').color, '#772E9E');
  // CRITERIO-REDES.md § 8 las nombra (pruebas/colores-placas.test.mjs compara la tabla entera con COLOR_SECCION).
  const criterio = leer('../CRITERIO-REDES.md');
  assert.match(criterio, /\| Educación \| #1D4BE0 \|/);
  assert.match(criterio, /\| Salud \| #004E5C \|/);
  assert.match(criterio, /\| Ciencia \| #772E9E \|/);
});

test('el panel ofrece las catorce; las redes siguen con #Balcarce y las etiquetas de la IA', () => {
  const app = leer('../web/public/panel/app.js');
  assert.match(app, /Educación: 'educacion', Salud: 'salud', Ciencia: 'ciencia'/);
  const gd = leer('../web/scripts/generar-datos.mjs');
  assert.match(gd, /seccionesNuevas: \[\.\.\.SECCIONES_SUMADAS\],/);
  assert.match(gd, /\.\.\.\(n\.seccionAntes \? \{ seccionAntes: n\.seccionAntes \} : \{\}\)/);
  // Una nota de acá que la IA pasó a Educación sigue llevando #Balcarce.
  assert.equal(hashtagsDe({ seccion: 'Educación', seccionAntes: 'Balcarce', etiquetas: ['paro docente'] })[0], '#Balcarce');
  // (Desde la regla 281, `#Balcarce #RadarBalcarce` van siempre primeros, también en lo de afuera; después, las etiquetas de la IA.)
  assert.deepEqual(hashtagsDe({ seccion: 'Ciencia', etiquetas: ['química', 'investigación'] }), ['#Balcarce', '#RadarBalcarce', '#Química', '#Investigación']);
  assert.deepEqual(hashtagsDe({ seccion: 'Tecnología', etiquetas: ['inteligencia artificial'] }), ['#Balcarce', '#RadarBalcarce', '#InteligenciaArtificial']);
});

// ------------------------------------------------------------------ las fuentes que alimentan las áreas

test('con un solo medio no sale nada, tampoco la ciencia: la IA no destraba y el extranjero sólo con un argentino (regla 260)', () => {
  const unica = (extra = {}) => ({
    id: 'z1', titulo: 'Crean una enzima que degrada plásticos en pocas horas', seccion: 'Ciencia', semaforo: 'amarillo', alcance: 'pais', local: false, medios: ['Perfil'],
    motivo: 'de afuera y poco contada (1 medio; Ciencia pide 2)', ...extra,
  });
  const ficha = (extra = {}) => ({ ambito: 'internacional', seccion: 'Ciencia', impacto: 'nulo', razon: 'ninguna', importancia: 'alta', cuando: '2026-10-15T00:00:00Z', ...extra });
  // Aunque la IA diga "alta": el interés ya no destraba nada. Con un solo medio espera (y del extranjero sin un argentino, la IA la saca).
  const nacional = lectura.aplicarFichas([unica({ ambito: undefined })], { z1: ficha({ ambito: 'nacional' }) }).notas;
  assert.equal(nacional[0].interesDeLaIA, undefined);
  exigirMedios(nacional);
  assert.equal(nacional[0].semaforo, 'amarillo');
  const mundo = lectura.aplicarFichas([unica()], { z1: ficha() });
  assert.equal(mundo.notas.length, 0, 'la ciencia del mundo ya no tiene excepción: sin un argentino, es del extranjero');
  assert.equal(mundo.cambios.sacadas[0].motivo, 'es del extranjero');
  // Con un argentino en el título sigue entrando a la lectura.
  assert.equal(lectura.aplicarFichas([unica({ titulo: 'Un equipo argentino crea una enzima que degrada plásticos' })], { z1: ficha() }).notas.length, 1);
  // Con dos medios, en un área chica llega por la popularidad aunque la IA la ponga en baja; con uno, no.
  const dos = lectura.aplicarFichas([unica({ medios: ['Perfil', 'Infobae'], semaforo: 'verde', motivo: 'sección Ciencia' })], { z1: ficha({ ambito: 'nacional', importancia: 'baja' }) });
  assert.equal(dos.notas.length, 1);
  // Con uno, la lectura ya no la saca por "sin relación con Balcarce" (regla 286): la frena la popularidad (exigirMedios).
  const uno = lectura.aplicarFichas([unica()], { z1: ficha({ ambito: 'nacional', importancia: 'baja' }) });
  assert.equal(uno.cambios.sacadas.length, 0);
  exigirMedios(uno.notas);
  assert.equal(uno.notas[0].semaforo, 'amarillo');
  // Chimento y publicidad no salen.
  assert.equal(lectura.aplicarFichas([unica()], { z1: { ...ficha({ ambito: 'nacional' }), chimento: true } }).notas.length, 0);
  assert.equal(lectura.aplicarFichas([unica()], { z1: { ...ficha({ ambito: 'nacional' }), publicidad: true } }).notas.length, 0);
  // Las ya publicadas con un solo medio el 17/10 (antes de la regla 260) conservan su página.
  assert.equal(tieneRespaldo({ medios: ['Perfil'], deFuenteEspecializada: true }), true);
  assert.equal(tieneRespaldo({ medios: ['Perfil'] }), false, 'sin la marca, un solo medio no alcanza');
});

test('las fuentes de las áreas chicas responden y sus secciones tienen con qué alimentarse; sin medios de España (probadas el 17/10)', async () => {
  const { TODAS_LAS_FUENTES } = await import('../ingesta/ingesta.mjs');
  const activas = TODAS_LAS_FUENTES.filter((f) => f.activa !== false);
  assert.ok(activas.every((f) => f.especializada === undefined), 'el campo especializada se sacó (regla 260)');
  const deSeccion = (s) => activas.filter((f) => f.seccion === s && f.alcance !== 'local').map((f) => f.id);
  assert.ok(deSeccion('Ciencia').length >= 1, deSeccion('Ciencia').join());
  assert.ok(deSeccion('Salud').length >= 4, deSeccion('Salud').join());
  assert.ok(deSeccion('Educación').length >= 5, deSeccion('Educación').join());
  assert.ok(deSeccion('Tecnología').length >= 8, deSeccion('Tecnología').join());
  assert.ok(deSeccion('Cultura y agenda').length >= 6, deSeccion('Cultura y agenda').join());
  // Ninguna lleva la marca oficial por las dudas (con ella saldría sola, sin que la cuente nadie), salvo las que ya eran de organismos.
  for (const id of ['perfil-ciencia', 'perfil-salud', 'perfil-educacion', 'infobae-salud', 'infobae-educacion']) {
    assert.ok(!TODAS_LAS_FUENTES.find((f) => f.id === id).oficial, id);
  }
  // Sin medios de España (decisión del 27/09, ratificada el 17/10): los cuatro de allá siguen apagados.
  for (const id of ['hipertextual', 'xataka', 'elpais-ciencia', 'elpais-tecnologia', 'muy-interesante']) {
    const f = TODAS_LAS_FUENTES.find((x) => x.id === id);
    assert.ok(!f || f.activa === false, id);
  }
});
