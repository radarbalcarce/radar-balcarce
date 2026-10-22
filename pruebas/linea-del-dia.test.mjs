// Regla 301 (18/10/2026, Hernán: "que tenga mayor correlatividad entre todos los reels e historias"): la línea editorial del día. Las piezas del día se
// enlazan entre sí con frases cortas y fijas por momento, comparten estructura (gancho de 3 segundos, cuerpo, cierre con el mismo llamado), un mismo trato y
// una misma voz, y una historia retoma el tema de un repaso sin repetir su titular. Todo determinístico, sin IA ni cupo de voz. Con los datos reales de
// web/data/portada.json: se arma el día entero con el plan de verdad y se revisa.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  rolDe, horaDicha, temaDe, temasDe, estructuraDe, oracionesDe, conLineaEditorialDelDia, problemasDeLaLinea, GANCHO_MAX_PALABRAS, GANCHOS_DE_CONTINUIDAD,
  ENLACES_HACIA_ADELANTE, RETOMAS, DESPEDIDAS_DEL_DIA, SEGUNDOS_MAXIMOS_DE_UN_DATO,
} from '../redes/linea-del-dia.mjs';
import {
  SALUDOS, PUENTES, revisarTexto, llamadoDelDia, guionClima, guionClimaNoche, guionFarmacia, saludoDePodcast, segundosDePodcast, segundosDe,
  CLIMA_VOZ, PIEZA_FIJA_VOZ, PODCAST_VOZ,
} from '../redes/guiones.mjs';
import { momentoDeHora } from '../redes/prompt-redes.mjs';
import { planDelDia } from '../reels/plan.mjs';
import { datosDeLaWeb } from '../redes/datos.mjs';
import { diaAR } from '../ingesta/zona.mjs';

const portada = JSON.parse(fs.readFileSync(new URL('../web/data/portada.json', import.meta.url), 'utf8'));
const banco = JSON.parse(fs.readFileSync(new URL('../web/data/banco-fotos.json', import.meta.url), 'utf8'));
const palabras = (t) => String(t).trim().split(/\s+/).filter(Boolean).length;

/** El día de la portada real, desde las 6 de la mañana, con todo lo que toca ese día (y lo opcional pedido). */
function diaReal({ hora = '06:00', libro = null, extra = ['utiles', 'agenda', 'participa-noticias'] } = {}) {
  const dia = diaAR(new Date(portada.generado));
  const fecha = new Date(`${dia}T${hora}:00-03:00`);
  // Sin `generado` no se mira la edad de la portada: así el clima y la farmacia no se descartan por ser de hace horas.
  const datos = { ...datosDeLaWeb(portada), generado: null };
  const { piezas } = planDelDia(datos, { fecha, libro, eventos: portada.agenda?.eventos ?? [], banco, forzar: extra });
  return { piezas, fecha, dia };
}

test('cada pieza tiene su capítulo del día, y lo que no es del día (los avisos de clima) no entra en la línea', () => {
  assert.equal(rolDe('clima-manana'), 'apertura');
  assert.equal(rolDe('efemeride'), 'dato');
  assert.equal(rolDe('feriado'), 'dato');
  assert.equal(rolDe('noticia1'), 'repaso-manana');
  assert.equal(rolDe('noticia2'), 'repaso-tarde');
  assert.equal(rolDe('podcast'), 'cierre-del-dia');
  assert.equal(rolDe('farmacia'), 'servicio-noche');
  assert.equal(rolDe('clima-noche'), 'clima-noche');
  for (const n of ['participa-noticias', 'participa-evento', 'participa-reclamos', 'participa-nota', 'agenda', 'utiles']) assert.equal(rolDe(n), 'servicio', n);
  assert.equal(rolDe('aviso-helada'), null);
  assert.equal(rolDe(undefined), null);
});

test('las horas se dicen como se hablan: "a las diez", "a las tres de la tarde", "a las nueve de la noche"; una hora con minutos no se dice', () => {
  assert.equal(horaDicha('10:00'), 'a las diez');
  assert.equal(horaDicha('07:00'), 'a las siete');
  assert.equal(horaDicha('13:00'), 'a la una de la tarde');
  assert.equal(horaDicha('15:00'), 'a las tres de la tarde');
  assert.equal(horaDicha('15:00', { franja: false }), 'a las tres');
  assert.equal(horaDicha('21:00'), 'a las nueve de la noche');
  assert.equal(horaDicha('21:30'), null, 'una hora con minutos no se enlaza');
  assert.equal(horaDicha('03:00'), null);
  assert.equal(horaDicha(undefined), null);
});

test('el tema de un repaso sale de la sección de sus notas ("lo del fútbol") y nunca de su titular; Política y Policiales no se nombran', () => {
  assert.equal(temaDe('Fútbol'), 'lo del fútbol');
  assert.equal(temaDe('Balcarce'), 'lo de acá');
  assert.equal(temaDe('Política'), null);
  assert.equal(temaDe('Policiales'), null);
  assert.equal(temasDe(['Fútbol', 'Fútbol', 'Balcarce', 'Agro']), 'lo del fútbol y lo de acá', 'hasta dos temas distintos, en orden');
  assert.equal(temasDe(['Política', 'Policiales']), '');
  assert.equal(temasDe([]), '');
});

test('el gancho dura 3 segundos: todos los saludos y las frases de continuidad tienen 8 palabras o menos, y las entradas de los repasos son cortas', () => {
  assert.equal(GANCHO_MAX_PALABRAS, 8);
  assert.ok(GANCHO_MAX_PALABRAS / 2.5 <= 3.3, 'a 2,5 palabras por segundo son 3 segundos');
  for (const [momento, saludos] of Object.entries(SALUDOS)) for (const s of saludos) assert.ok(palabras(s) <= GANCHO_MAX_PALABRAS, `${momento}: "${s}"`);
  for (const [rol, frases] of Object.entries(GANCHOS_DE_CONTINUIDAD)) for (const f of frases) assert.ok(palabras(f) <= GANCHO_MAX_PALABRAS, `${rol}: "${f}"`);
  for (const p of PUENTES) assert.ok(palabras(p) <= GANCHO_MAX_PALABRAS, p);
  for (const momento of ['manana', 'tarde', 'noche']) {
    for (let d = 1; d <= 12; d += 1) {
      const entrada = saludoDePodcast(momento, { fecha: new Date(`2026-10-${String(d).padStart(2, '0')}T12:00:00-03:00`) });
      const [, ...intro] = oracionesDe(entrada);
      assert.ok(intro.length && palabras(intro[0]) <= 10, `${momento}: la línea de entrada "${intro[0]}" tiene que ser corta`);
    }
  }
});

test('las frases de la línea cumplen las reglas de la voz: sin exclamaciones, sin tuteo, sin jerga forzada, sin nombrar medios', () => {
  const todas = [
    ...Object.values(GANCHOS_DE_CONTINUIDAD).flat(),
    ...Object.values(ENLACES_HACIA_ADELANTE).flat().map((f) => f.replace('{hs}', 'a las diez').replace('{h}', 'a las diez')),
    ...Object.values(RETOMAS).flat().map((f) => f.replace('{temas}', 'lo del fútbol y lo de acá')),
    ...DESPEDIDAS_DEL_DIA,
  ];
  for (const f of todas) {
    assert.deepEqual(revisarTexto(`Buen día, Balcarce. ${f} Radar Balcarce.`, { tipo: 'voz' }), [], f);
    assert.ok(/^[A-ZÁÉÍÓÚ¿]/.test(f.charAt(0).toUpperCase() + f.slice(1)), f);
  }
  // El revisor sabe de trato: el tuteo y la jerga se detectan.
  assert.ok(revisarTexto('Buen día, Balcarce. Guarda el dato. Radar Balcarce.').some((p) => /tutea/.test(p)));
  assert.ok(revisarTexto('Buen día, Balcarce. Tú puedes llamar. Radar Balcarce.').some((p) => /tutea/.test(p)));
  assert.ok(revisarTexto('Buen día, Balcarce. Che, mirá esto. Radar Balcarce.').some((p) => /jerga/.test(p)));
  assert.deepEqual(revisarTexto('Buen día, Balcarce. Guardá el dato, que te sirve. Radar Balcarce.'), []);
});

test('un día completo con los datos reales de la portada: todas las piezas cumplen la línea y las reglas de siempre', () => {
  const { piezas } = diaReal();
  const nombres = piezas.filter((p) => !p.fueraDeTecho).map((p) => p.nombre);
  // (El repaso de la noche y el de la tarde dependen de las notas que tenga la portada de ese momento: no se exigen.)
  for (const n of ['clima-manana', 'noticia1', 'clima-noche']) assert.ok(nombres.includes(n), `el día real tiene ${n}`);
  const titulares = portada.notas.map((n) => n.titulo);
  assert.deepEqual(problemasDeLaLinea(piezas, { titulares }), []);
  for (const p of piezas.filter((x) => !x.fueraDeTecho && rolDe(x.nombre))) {
    // `revisarTexto` es el control de toda pieza con voz (CRITERIO-REDES.md § 4): saludo de su hora, la dirección dicha, sin exclamaciones, sin fuente…
    const momento = momentoDeHora(p.hora);
    const problemas = revisarTexto(p.guion, { tipo: 'voz' }).filter((x) => !/saluda con otro horario|repite "Balcarce"/.test(x));
    assert.deepEqual(problemas, [], `${p.nombre}: ${p.guion}`);
    assert.ok(!/buen d[ií]a/i.test(p.guion) || momento === 'manana', `${p.nombre}: "buen día" fuera de la mañana`);
  }
  // Los repasos no se pasaron del presupuesto por la línea; el clima y las piezas fijas, tampoco.
  for (const p of piezas.filter((x) => ['noticia1', 'noticia2', 'podcast'].includes(x.nombre))) assert.ok(segundosDePodcast(p.guion) <= PODCAST_VOZ.segundosPresupuesto, `${p.nombre}: ${segundosDePodcast(p.guion).toFixed(1)} s`);
  for (const p of piezas.filter((x) => ['clima-manana', 'clima-noche'].includes(x.nombre))) assert.ok(segundosDe(p.guion) <= CLIMA_VOZ.segundosMaximo, `${p.nombre}: ${segundosDe(p.guion).toFixed(1)} s`);
  for (const p of piezas.filter((x) => ['farmacia', 'participa-noticias', 'agenda'].includes(x.nombre) && !x.fueraDeTecho)) assert.ok(segundosDe(p.guion) <= PIEZA_FIJA_VOZ.segundosMaximo, `${p.nombre}: ${segundosDe(p.guion).toFixed(1)} s`);
  for (const p of piezas.filter((x) => x.nombre === 'efemeride')) assert.ok(segundosDe(p.guion) <= SEGUNDOS_MAXIMOS_DE_UN_DATO, `efeméride: ${segundosDe(p.guion).toFixed(1)} s`);
});

test('las piezas se enlazan: cada una anuncia la que sigue con su hora, y no promete lo que no está en el plan', () => {
  const { piezas } = diaReal();
  const por = Object.fromEntries(piezas.filter((p) => !p.fueraDeTecho).map((p) => [p.nombre, p]));
  // El clima de la mañana anuncia el repaso de las diez; el repaso de la tarde recuerda el de la noche.
  assert.equal(por['clima-manana'].linea.hacia, 'noticia1');
  assert.match(por['clima-manana'].guion, /a las diez/i);
  // (Depende de la portada del día: si hoy el repaso de la noche no tiene notas para armarse, no hay con qué enlazar.)
  if (por.noticia2?.linea?.hacia) assert.equal(por.noticia2.linea.hacia, 'podcast');
  if (por.noticia2?.linea?.hacia) assert.match(por.noticia2.guion, /Recordá que a las nueve de la noche cerramos con el repaso del día|a las nueve de la noche cerramos|a las nueve de la noche, el repaso/i);
  if (por['clima-noche']?.linea?.hacia) assert.equal(por['clima-noche'].linea.hacia, 'podcast');
  if (por['clima-noche']?.linea?.hacia) assert.match(por['clima-noche'].guion, /a las nueve de la noche/i);
  // Sin el repaso de la noche en el plan, el clima de la noche no lo anuncia.
  const sinNoche = piezas.filter((p) => p.nombre !== 'podcast').map((p) => ({ ...p, guion: p.guion }));
  const antes = sinNoche.find((p) => p.nombre === 'clima-noche').guion;
  const cambios = conLineaEditorialDelDia(sinNoche, { fecha: new Date(`${diaAR(new Date(portada.generado))}T06:00:00-03:00`) });
  assert.ok(!cambios.find((c) => c.nombre === 'clima-noche')?.hizo.includes('adelante'));
  assert.ok(!/cerramos con el repaso del día/.test(sinNoche.find((p) => p.nombre === 'clima-noche').guion), antes);
  // Lo que ya salió no se anuncia: con el repaso de las diez en el libro, el clima de la mañana (que se vuelve a armar) no lo promete.
  const dia = diaAR(new Date(portada.generado));
  const conLibro = diaReal({ libro: { instagram: { [`${dia}/noticia1`]: { notaIds: [] } } } }).piezas;
  assert.ok(!/a las diez/i.test(conLibro.find((p) => p.nombre === 'clima-manana').guion), 'el repaso de las diez ya salió: no se anuncia');
  assert.equal(conLibro.find((p) => p.nombre === 'clima-manana').linea.hacia, null);
});

test('una historia retoma el TEMA del repaso anterior y nunca su titular; el repaso de la mañana retoma el de ayer', () => {
  // Con el libro de redes: ayer cerró con tres notas y hoy ya salieron el repaso de la mañana y el de la tarde.
  const notas = portada.notas.filter((n) => !['Política', 'Policiales'].includes(n.seccion) && temaDe(n.seccion));
  const ids = (desde, n) => notas.slice(desde, desde + n).map((n2) => n2.id);
  const dia = diaAR(new Date(portada.generado));
  const ayer = diaAR(new Date(new Date(`${dia}T12:00:00-03:00`).getTime() - 86400e3));
  const libro = {
    instagram: {
      [`${ayer}/podcast`]: { notaId: null, notaIds: ids(0, 3) },
      [`${dia}/noticia1`]: { notaId: ids(3, 1)[0], notaIds: ids(3, 4) },
      [`${dia}/noticia2`]: { notaId: ids(7, 1)[0], notaIds: ids(7, 4) },
    },
  };
  const { piezas } = diaReal({ hora: '18:00', libro, extra: [] });
  const por = Object.fromEntries(piezas.map((p) => [p.nombre, p]));
  const titulares = notas.slice(0, 11).map((n) => n.titulo);
  // La farmacia (una historia) retoma el tema del último repaso, de a uno solo; el clima de la noche anuncia el repaso que cierra el día.
  const farmacia = por.farmacia;
  assert.ok(farmacia, 'el plan armó la farmacia');
  assert.ok(farmacia.linea.hizo.includes('retoma'), `la farmacia retoma lo ya contado: ${farmacia.guion}`);
  assert.match(farmacia.guion, /(Si te quedaste con|Seguí)? ?lo (de|del) [^,.]+/, 'dice el tema');
  for (const p of [farmacia, por['clima-noche']]) for (const t of titulares) assert.ok(!p.guion.includes(t), `${p.nombre} repite el titular "${t}"`);
  assert.ok(por['clima-noche'].linea.hizo.includes('adelante'));
  assert.deepEqual(problemasDeLaLinea(piezas, { titulares }), []);
  // El repaso de la noche: "Hoy ya te contamos…" cuando cabe en los 55 segundos, y nunca se pasa.
  const noche = por.podcast;
  assert.ok(segundosDePodcast(noche.guion) <= PODCAST_VOZ.segundosPresupuesto);
  // El de la mañana de mañana: con el de ayer en el libro, abre con "Ayer te contamos…" (si hay lugar).
  const hoyConAyer = diaReal({ hora: '06:00', libro: { instagram: { [`${ayer}/podcast`]: { notaIds: ids(0, 3) } } }, extra: [] }).piezas.find((p) => p.nombre === 'noticia1');
  if (hoyConAyer.linea.hizo.includes('retoma')) assert.match(hoyConAyer.guion, /Ayer (te contamos|cerramos el día con) lo (de|del) /);
});

test('el llamado es el mismo en todas las piezas de la fecha, y ese día todas dicen la dirección o ninguna', () => {
  let conDireccion = 0;
  for (let d = 1; d <= 30; d += 1) {
    const fecha = new Date(`2026-09-${String(d).padStart(2, '0')}T12:00:00-03:00`);
    const clima = { ahora: { temp: 11, cielo: 'Despejado', viento: 10 }, dias: [{ min: 6, max: 17, lluvia: 10 }, { min: 7, max: 19, lluvia: 10 }] };
    const turno = { farmacias: ['DEL PUEBLO'], detalle: [{ nombre: 'DEL PUEBLO', direccion: 'Calle 17 N° 1140' }] };
    const piezas = [guionClima(clima, null, { fecha }), guionClimaNoche(clima, { fecha }), guionFarmacia(turno, { fecha })];
    const dicen = piezas.map((g) => /punto com\.$/.test(g));
    assert.ok(dicen.every((x) => x === dicen[0]), `el ${d}: ${dicen} (una pieza dice la dirección y otra no)`);
    const cierres = piezas.map((g) => estructuraDe(g).llamado);
    assert.equal(new Set(cierres).size, 1, `el ${d}: ${cierres.join(' | ')}`);
    assert.equal(cierres[0], llamadoDelDia(fecha));
    if (dicen[0]) conDireccion += 1;
  }
  assert.ok(conDireccion >= 4 && conDireccion <= 18, `la dirección se dijo ${conDireccion} de 30 días (1 de cada 3, más o menos)`);
});

test('es determinístico: la misma fecha da el mismo día, y fechas distintas dan frases distintas', () => {
  const a = diaReal().piezas.map((p) => p.guion);
  const b = diaReal().piezas.map((p) => p.guion);
  assert.deepEqual(a, b);
  const variantes = new Set();
  const base = [
    { nombre: 'clima-manana', hora: '07:00', guion: 'Buen día, Balcarce. Hoy hay sol. Que el día les sea leve. Radar Balcarce.' },
    { nombre: 'noticia1', hora: '10:00', guion: 'Buen día, Balcarce. Las noticias. Para arrancar: algo. Que el día les sea leve. Radar Balcarce.' },
  ];
  for (let d = 1; d <= 20; d += 1) {
    const piezas = base.map((p) => ({ ...p }));
    conLineaEditorialDelDia(piezas, { fecha: new Date(`2026-10-${String(d).padStart(2, '0')}T12:00:00-03:00`) });
    variantes.add(piezas[0].guion);
  }
  assert.ok(variantes.size >= 3, `en 20 días salieron ${variantes.size} textos distintos`);
});

test('no suma nada que no quepa: una pieza al límite de su duración queda como está', () => {
  // Un repaso que ya llena los 55 segundos no recibe ninguna frase.
  const justo = `Buenas noches, Balcarce. Cerramos este sábado con lo que faltaba. ${'Palabra '.repeat(Math.floor((PODCAST_VOZ.segundosPresupuesto - 1.65) * PODCAST_VOZ.palabrasPorSegundo) - 24)}Que descansen. Todo con más detalle en Radar Balcarce punto com.`;
  const piezas = [
    { nombre: 'podcast', hora: '21:00', guion: justo },
    { nombre: 'noticia2', hora: '15:00', guion: justo.replace('Buenas noches', 'Buenas tardes') },
  ];
  const antes = piezas.map((p) => p.guion);
  conLineaEditorialDelDia(piezas, { fecha: new Date('2026-10-17T12:00:00-03:00'), repasosDeHoy: [{ nombre: 'noticia2', hora: '15:00', secciones: ['Fútbol'] }] });
  assert.ok(piezas.every((p) => segundosDePodcast(p.guion) <= PODCAST_VOZ.segundosPresupuesto), 'ningún repaso se pasa por la línea');
  assert.ok(piezas[0].guion.length >= antes[0].length - 5);
  // Un clima que ya llena sus 25 segundos tampoco.
  const largo = `Buen día, Balcarce. ${'Hoy hay mucho sol y viento '.repeat(Math.floor(CLIMA_VOZ.segundosMaximo * 2.5 / 6))}Que el día les sea leve. Radar Balcarce.`;
  const clima = [{ nombre: 'clima-manana', hora: '07:00', guion: largo }, { nombre: 'noticia1', hora: '10:00', guion: 'Buen día, Balcarce. Hola. Para arrancar: algo. Radar Balcarce.' }];
  conLineaEditorialDelDia(clima, { fecha: new Date('2026-10-17T12:00:00-03:00') });
  assert.ok(segundosDe(clima[0].guion) <= Math.max(CLIMA_VOZ.segundosMaximo, segundosDe(largo)), 'el clima no crece más allá de su tope');
});

test('el feriado, que no traía firma, la recibe; y lo que ya traía un llamado propio lo conserva', () => {
  const piezas = [
    { nombre: 'feriado', hora: '08:00', guion: 'Buen día, Balcarce. Hoy es feriado: el Día de la Soberanía. Que tengan un buen feriado.' },
    { nombre: 'utiles', hora: '17:00', guion: 'Buenas tardes, Balcarce. Anotá los teléfonos. Los encontrás todos en la web de Radar Balcarce.' },
    { nombre: 'participa-nota', hora: '12:00', guion: 'Buen día, Balcarce. ¿Tenés una nota? Mandanosla. Radar Balcarce.' },
  ];
  const fecha = new Date('2026-10-17T12:00:00-03:00');
  conLineaEditorialDelDia(piezas, { fecha });
  const llamado = llamadoDelDia(fecha);
  assert.ok(piezas[0].guion.endsWith(llamado), `el feriado cierra con el llamado del día: ${piezas[0].guion}`);
  assert.ok(piezas[1].guion.endsWith('Los encontrás todos en la web de Radar Balcarce.'), 'los útiles conservan su llamado propio');
  assert.ok(piezas[2].guion.endsWith(llamado), 'participá cambia su firma por la del día');
  assert.deepEqual(problemasDeLaLinea(piezas), []);
});

test('el plan aplica la línea después de la memoria del día, en las dos salidas, y guarda las secciones de cada repaso', () => {
  const plan = fs.readFileSync(new URL('../reels/plan.mjs', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.equal([...plan.matchAll(/conMemoriaDelDia\(piezas, momentoDeHora, \{ fecha \}\);\n\s+aplicarLineaDelDia\(\);/g)].length, 2);
  assert.match(plan, /secciones: elegidas\.map\(\(n\) => n\.seccion\)/);
});
