// La lista de fuentes elegida el 15/10/2026 (docs/etapa-1-fuentes/LISTA-ELEGIDA.md): todo lo de Balcarce,
// los 50 mejores medios del país y los 10 mejores de Tandil y Mar del Plata. Nada más se lee, salvo las fuentes de ciencia, salud,
// educación y tecnología que se sumaron el 17/10 (regla 215, Hernán: "todas las secciones tienen que tener notas todos los días").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TODAS_LAS_FUENTES, cuantosMedios, contarMedios, exigirMedios } from '../ingesta/ingesta.mjs';

const activas = TODAS_LAS_FUENTES.filter((f) => f.activa !== false);
const mediosDe = (xs) => new Set(xs.map((f) => f.medio));

test('la lista tiene 11 medios de Balcarce, 10 de Tandil y Mar del Plata, 50 del país y 11 de ciencia, salud, educación y tecnología (17/10)', () => {
  const balcarce = activas.filter((f) => f.alcance === 'local');
  // Argenpapa (la papa, de Balcarce) se lee como "región" pero es un especializado nacional.
  const zona = activas.filter((f) => f.alcance === 'region' && f.id !== 'argenpapa');
  const pais = activas.filter((f) => !balcarce.includes(f) && !zona.includes(f));
  assert.equal(mediosDe(balcarce).size, 11);
  assert.equal(mediosDe(zona).size, 10);
  // Los 50 de la lista elegida menos dos que la regla 260 (17/10) apagó porque casi no publican (Agencia CyTA y el Ministerio de Capital Humano),
  // más los 7 medios que se sumaron el 17/10 y siguen (SENASA, cuatro universidades, IT Sitio y FayerWayer). CONAE, INTI, ANMAT y la Secretaría de
  // Innovación, Ciencia y Tecnología también se sumaron ese día y se apagaron por lo mismo.
  const sumadosEl17 = ['SENASA', 'Universidad Nacional de La Plata', 'Universidad Nacional de Rosario', 'UNICEN', 'Universidad Nacional de Cuyo', 'IT Sitio', 'FayerWayer'];
  for (const m of sumadosEl17) assert.ok(mediosDe(pais).has(m), m);
  for (const m of ['CONAE', 'INTI', 'ANMAT', 'Secretaría de Innovación, Ciencia y Tecnología', 'Agencia CyTA', 'Ministerio de Capital Humano']) assert.ok(!mediosDe(pais).has(m), `${m} está apagada`);
  // Y los 12 medios que se sumaron el 26/10 para Ciencia, Agro y Educación (Infobae · Ciencia es el mismo medio que Infobae: no suma uno).
  const sumadosEl26 = ['DW Español', 'El Tiempo (Colombia)', 'Facultad de Ciencias Exactas y Naturales (UBA)', 'Mongabay Latam', 'Agrofy News', 'Agroverdad', 'Valor Carne', 'Ruralnet',
    'Universidad Nacional de Mar del Plata', 'Universidad Nacional de Quilmes', 'Universidad Nacional de La Matanza', 'Universidad Nacional de Salta'];
  for (const m of sumadosEl26) assert.ok(mediosDe(pais).has(m), m);
  assert.equal(mediosDe(pais).size, 48 + sumadosEl17.length + sumadosEl26.length);
  assert.equal(mediosDe(activas).size, 69 + sumadosEl17.length + sumadosEl26.length);
  // Todas las de la zona son de Tandil o de Mar del Plata.
  for (const f of zona) assert.match(f.ciudad ?? '', /Tandil|Mar del Plata/, `${f.id}: ${f.ciudad}`);
});

test('todos los medios de Balcarce y sus organismos están, incluido el Concejo Deliberante', () => {
  const medios = mediosDe(activas);
  for (const m of ['News Balcarce (FM 91.7)', 'Puntonueve (FM 100.9)', 'Infórmese Primero (FM 104.9)', 'Radio Gabal (FM 104.1)', 'El Diario Balcarce',
    'Acción 5 (Balcarce)', 'Ahora Balcarce', 'Diario La Vanguardia', 'Municipalidad de Balcarce', 'Concejo Deliberante de Balcarce']) {
    assert.ok(medios.has(m), `falta ${m}`);
  }
  const concejo = activas.find((f) => f.id === 'concejo-deliberante-balcarce');
  assert.equal(concejo.alcance, 'local');
  assert.ok(concejo.oficial);
});

test('lo que quedó afuera de la lista está apagado y dice por qué (no se borró)', () => {
  const apagadasDelDia = TODAS_LAS_FUENTES.filter((f) => /apagada 15\/10\/2026/.test(f.nota ?? ''));
  assert.ok(apagadasDelDia.length > 100, 'las apagadas el 15/10 llevan su nota con la fecha');
  for (const f of apagadasDelDia) assert.equal(f.activa, false, f.id);
  // Fuera de la lista (Necochea, Lobería, Ayacucho, chimentos, blogs de empresas…): nada activo.
  for (const m of ['Ecos Diarios (Necochea)', '2261 – Noticias de Lobería', 'Sendero Regional', 'Ayacucho al Día', 'Radio Sudestada', 'Google', 'OpenAI', 'NASA', 'ESPN Argentina', 'TNT Sports']) {
    assert.ok(!activas.some((f) => f.medio === m), `${m} no está en la lista elegida`);
  }
});

test('un medio con un feed que trae todo no se lee por varios: TN, El Destape, Cronista, NA y Olé, sólo el índice de noticias', () => {
  for (const m of ['TN (Todo Noticias)', 'El Destape', 'El Cronista', 'Noticias Argentinas (NA)', 'Olé', 'TyC Sports', 'Minuto Uno', 'C5N']) {
    const feeds = activas.filter((f) => f.medio === m);
    assert.equal(feeds.length, 1, m);
    assert.equal(feeds[0].tipo, 'sitemap', m);
  }
});

test('los medios que comparten dueño o sistema llevan `grupo` y cuentan una sola vez al juntar medios', () => {
  const grupoDe = (m) => TODAS_LAS_FUENTES.find((f) => f.medio === m)?.grupo;
  for (const m of ['Clarín', 'TN (Todo Noticias)', 'Olé', 'Radio Mitre']) assert.equal(grupoDe(m), 'Grupo Clarín', m);
  for (const m of ['El Eco de Tandil', 'El Marplatense', 'QZ Noticias (Mar del Plata)', 'LU9 Mar del Plata', 'Ecos Diarios (Necochea)', 'La Noticia 1', 'La Voz del Pueblo']) {
    assert.equal(grupoDe(m), 'eleco.com.ar', m);
  }
  assert.equal(contarMedios(['Clarín', 'TN (Todo Noticias)', 'Olé', 'Radio Mitre']), 1);
  assert.equal(contarMedios(['Clarín', 'TN (Todo Noticias)', 'Infobae']), 2);
  assert.equal(contarMedios(['El Eco de Tandil', 'El Marplatense', 'QZ Noticias (Mar del Plata)', 'LU9 Mar del Plata', 'Infobae', 'Perfil']), 3);
  assert.equal(contarMedios(['Infobae', 'Infobae', 'Perfil', null, '']), 2, 'un mismo medio una vez; los vacíos no cuentan');
  assert.equal(contarMedios(['Medio desconocido', 'Otro']), 2, 'sin grupo, cada nombre cuenta');
  assert.equal(cuantosMedios({ medios: ['Clarín', 'Olé', 'Perfil'] }), 2);
  assert.equal(cuantosMedios({ medio: 'Clarín' }), 1);
  assert.equal(cuantosMedios({}), 0);
});

test('el mismo grupo no alcanza para el mínimo: Clarín, TN, Olé y Mitre juntos no son tres medios para Fútbol', () => {
  const juntos = { id: 'a', seccion: 'Fútbol', semaforo: 'verde', local: false, medios: ['Clarín', 'TN (Todo Noticias)', 'Olé', 'Radio Mitre'] };
  const variados = { id: 'b', seccion: 'Fútbol', semaforo: 'verde', local: false, medios: ['Clarín', 'Infobae', 'Perfil', 'TyC Sports'] };
  exigirMedios([juntos, variados]);
  assert.equal(juntos.semaforo, 'amarillo');
  assert.match(juntos.motivo, /1 medio; Fútbol pide 3/);
  assert.equal(variados.semaforo, 'verde');
});

test('las fuentes nuevas llevan ciudad y alcance, y las que no son organismos de Balcarce no se marcan oficiales', () => {
  for (const id of ['ambito-general-sitemap', 'c5n-general-sitemap', 'minuto-uno-general-sitemap', 'la-capital-rosario-general-sitemap', 'la-gaceta-tucuman-general',
    'los-andes-mendoza-general-sitemap', 'eldiarioar-general', 'salud-nacion', 'capital-humano']) {
    const f = TODAS_LAS_FUENTES.find((x) => x.id === id);
    assert.ok(f && f.ciudad && f.alcance && f.url && f.peso, id);
    assert.ok(!f.oficial, `${id}: sin la marca oficial, como INTA: con ella saldría sola`);
  }
});
