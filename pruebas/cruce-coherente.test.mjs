// Lo que quedó de antes del cruce de medios, llevado a su lógica (27/09,
// Hernán: "si quedó algo viejo hay que ver que esté corregido al formato del
// cruce; que todo quede con lógica").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TODAS_LAS_FUENTES, parsearFeed, tituloDelSitemap } from '../ingesta/ingesta.mjs';
import { fichaValida, aplicarFichas, ciudadDelMedio } from '../ingesta/lectura-ia.mjs';
import { REGLAS_SEMAFORO } from '../ingesta/fuentes.mjs';

// El dominio registrable ("tn.com.ar", "infobae.com"): con él se ve si dos
// fuentes son del mismo sitio aunque tengan otro nombre.
const dominio = (url) => {
  const partes = new URL(url).hostname.replace(/^www\./, '').split('.');
  const n = partes.at(-1).length === 2 && ['com', 'gob', 'gov', 'org', 'net', 'edu'].includes(partes.at(-2)) ? 3 : 2;
  return partes.slice(-n).join('.');
};

test('un medio, un nombre: las secciones de un mismo diario no cuentan como dos medios en el cruce', () => {
  // El 27/09 "La Tecla" y "La Tecla Mar del Plata" (el mismo contenido), y TN
  // con cuatro nombres (TN, TN Campo, TN Tecno, TN Clima), hacían pasar por
  // "dos medios" lo que contaba uno solo.
  const porDominio = new Map();
  for (const f of TODAS_LAS_FUENTES.filter((x) => x.activa !== false)) {
    const d = dominio(f.url);
    // Siete medios distintos de la región comparten el servidor de su plataforma.
    if (d === 'eleco.com.ar' && /apiv3\./.test(f.url)) continue;
    // Ministerios distintos en el mismo portal del Estado (alta del 15/10/2026).
    if (d === 'argentina.gob.ar') continue;
    // La Universidad de Mar del Plata y su Facultad de Ciencias Agrarias (la de Balcarce) son una institución: llevan el mismo `grupo` y cuentan una sola vez (26/10/2026).
    if (d === 'mdp.edu.ar' && TODAS_LAS_FUENTES.filter((x) => dominio(x.url) === d).every((x) => x.grupo === 'mdp.edu.ar')) continue;
    if (!porDominio.has(d)) porDominio.set(d, new Set());
    porDominio.get(d).add(f.medio);
  }
  const conVariosNombres = [...porDominio].filter(([, s]) => s.size > 1).map(([d, s]) => `${d}: ${[...s].join(' | ')}`);
  assert.deepEqual(conVariosNombres, []);
  const medios = new Set(TODAS_LAS_FUENTES.map((f) => f.medio));
  assert.ok(!medios.has('La Tecla Mar del Plata') && medios.has('La Tecla'), 'La Tecla de Mar del Plata repite a La Tecla');
  assert.ok(!medios.has('Ecos Diarios'), 'Ecos Diarios va con un solo nombre');
});

test('el título de La Tecla sale del epígrafe: su news:title son palabras sueltas', () => {
  const url = (titulo, epigrafe) => `<url><loc>https://www.latecla.info/1-nota</loc><image:image><image:caption><![CDATA[${epigrafe}]]></image:caption></image:image><news:news><news:publication_date>2026-09-27T11:33:00-03:00</news:publication_date><news:title><![CDATA[${titulo}]]></news:title></news:news></url>`;
  assert.equal(tituloDelSitemap(url('Bicameral seguridad', 'La Libertad Avanza pide una bicameral para fiscalizar la seguridad de Kicillof')),
    'La Libertad Avanza pide una bicameral para fiscalizar la seguridad de Kicillof');
  // Un título de verdad no se toca, aunque haya epígrafe.
  assert.equal(tituloDelSitemap(url('El Senado aprobó la reforma de la Carta Orgánica del Banco Central', 'Sesión en el Senado')),
    'El Senado aprobó la reforma de la Carta Orgánica del Banco Central');
  // Un crédito de foto no es un título.
  assert.equal(tituloDelSitemap(url('Vista', 'Foto: gentileza de la Municipalidad de La Plata y su equipo')), 'Vista');
  const [n] = parsearFeed(`<urlset>${url('Organismo celular', 'La juventud del organismo celular se reúne en La Plata este sábado')}</urlset>`, { id: 'latecla', medio: 'La Tecla', alcance: 'provincia' });
  assert.equal(n.titulo, 'La juventud del organismo celular se reúne en La Plata este sábado');
});

test('la IA marca los chimentos y salen; las fichas viejas, sin la marca, no cambian', () => {
  const base = { id: 'w', ambito: 'nacional', lugar_del_hecho: 'CABA', seccion: 'Cultura y agenda', impacto_balcarce: 'nulo', razon: 'popular', importancia: 'media', es_publicidad: false, es_anuncio: false, por_que_interesa: 'x', clave_tema: 'x' };
  const chimento = fichaValida({ ...base, es_chimento: true });
  assert.equal(chimento.chimento, true);
  assert.equal(fichaValida(base).chimento, false, 'sin el campo, no es chimento');
  const nota = { id: 'w', titulo: 'Wanda Nara eligió el silencio y mostró su Family Day', seccion: 'Cultura y agenda', semaforo: 'verde', local: false, medios: ['A', 'B', 'C', 'D'] };
  const r = aplicarFichas([nota], { w: chimento }, { verdeSecciones: REGLAS_SEMAFORO.verdeSecciones });
  assert.equal(r.notas.length, 0);
  assert.equal(r.cambios.sacadas[0].motivo, 'es un chimento');
});

test('la IA sabe de qué ciudad es cada medio del cruce, no "desconocida"', async () => {
  const { FUENTES_CRUCE } = await import('../ingesta/fuentes-cruce.mjs');
  const sinCiudad = FUENTES_CRUCE.filter((f) => ciudadDelMedio({ medio: f.medio }) === 'desconocida').map((f) => f.medio);
  assert.deepEqual([...new Set(sinCiudad)], []);
});

test('ya no hay secciones Región ni Provincia: lo de afuera que no encaja va a Argentina', async () => {
  const { paraPruebas } = await import('../ingesta/ingesta.mjs');
  const n = (alcance) => ({ titulo: 'Se presentó la guía para una comunicación inclusiva', cuerpo: '', categorias: [], alcance });
  assert.equal(paraPruebas.clasificar(n('provincia')), 'Argentina');
  assert.equal(paraPruebas.clasificar(n('region')), 'Argentina');
  const { SECCIONES } = await import('../web/lib/datos.js');
  assert.ok(!SECCIONES.some((s) => ['Región', 'Provincia'].includes(s.nombre)));
});

test('un medio de Balcarce que copia una noticia de afuera no la vuelve "de Balcarce" (27/09, Malvinas)', async () => {
  const { ingestar } = await import('../ingesta/ingesta.mjs');
  const f = (id, medio, alcance) => ({ id, nombre: medio, medio, url: `https://${id}.test/rss`, tipo: 'rss', alcance, peso: alcance === 'local' ? 28 : 10 });
  const fuentes = [f('local1', 'Radio de Acá', 'local'), f('nac1', 'Nacional Uno', 'pais'), f('nac2', 'Nacional Dos', 'pais')];
  const item = (t, l, d = `${t}. Más detalles de la nota.`) => `<item><title>${t}</title><link>https://x.test/${l}</link><pubDate>${new Date().toUTCString()}</pubDate><description>${d}</description></item>`;
  const malvinas = 'Reino Unido asegura que Argentina no tiene capacidad para tomar las Malvinas';
  const autodromo = 'Reabre el autódromo con una multitud en las tribunas';
  const feeds = {
    'https://local1.test/rss': [item(malvinas, 'l1'), item(autodromo, 'l2', `${autodromo}. Miles de personas llegaron a Balcarce para la reapertura.`)],
    'https://nac1.test/rss': [item(malvinas, 'n1'), item(autodromo, 'n2')],
    'https://nac2.test/rss': [item(malvinas, 'm1')],
  };
  const xml = (url) => `<rss><channel>${(feeds[url] ?? []).join('')}</channel></rss>`;
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = async (url) => ({ ok: true, status: 200, headers: new Map(), text: async () => xml(url), arrayBuffer: async () => new TextEncoder().encode(xml(url)).buffer });
  try {
    const r = await ingestar({ fuentes, silencioso: true, memoria: null });
    const m = r.notas.find((n) => /Malvinas/.test(n.titulo));
    assert.ok(m, 'la de Malvinas entra (la cuentan tres medios)');
    assert.equal(m.local, false, 'es una noticia de afuera aunque la haya copiado un medio de acá');
    assert.notEqual(m.medio, 'Radio de Acá', 'la principal es de un medio de afuera');
    const a = r.notas.find((n) => /autódromo/.test(n.titulo));
    assert.equal(a.local, true, 'lo que el medio de acá cuenta de Balcarce sigue siendo de acá');
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});
