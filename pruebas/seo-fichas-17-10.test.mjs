// Datos estructurados, títulos de sección e imágenes para compartir (17/10/2026, regla 251). Sin red y sin compilar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  imagenesParaCompartir, datosDeSeccion, editorDeNota, imagenesDeNota,
} from '../web/lib/datos-estructurados.js';
import {
  tituloDeSeccion, SECCIONES, LARGO_MAXIMO_TITULO_DE_SECCION, nombreCorto, descripcionDeSeccion,
} from '../web/lib/datos.js';

const leer = (r) => fs.readFileSync(new URL(`../${r}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const BASE = 'https://radarbalcarce.com';
const SITIO = { url: '/opengraph-image', width: 1200, height: 630, type: 'image/png', alt: 'Radar Balcarce' };
const nota = { id: 'a', titulo: 'Titular de prueba', ruta: '/nota/titular-a', foto: { archivo: 'fotos-notas/a.jpg', credito: 'Foto: Municipalidad' } };
const comun = { urlTarjeta: '/nota/titular-a/opengraph-image', tarjetaDelSitio: SITIO, urlFoto: (a) => `/${a}` };

test('una nota con tarjeta propia comparte la tarjeta primero y, si es grande, su foto detrás', () => {
  const grande = imagenesParaCompartir({ nota, tarjeta: true, ...comun, dimensiones: () => ({ ancho: 1600, alto: 900 }) });
  assert.equal(grande.length, 2);
  assert.deepEqual(grande[0], { url: '/nota/titular-a/opengraph-image', width: 1200, height: 630, type: 'image/png', alt: 'Titular de prueba' });
  assert.deepEqual(grande[1], { url: '/fotos-notas/a.jpg', width: 1600, height: 900, type: 'image/jpeg', alt: 'Titular de prueba' });
  // Una foto de menos de 1200 px no se declara sola: la tarjeta alcanza.
  assert.equal(imagenesParaCompartir({ nota, tarjeta: true, ...comun, dimensiones: () => ({ ancho: 900, alto: 600 }) }).length, 1);
});

test('una nota archivada, sin tarjeta, comparte su foto con el tamaño real en vez de la tarjeta del sitio', () => {
  const r = imagenesParaCompartir({ nota, tarjeta: false, ...comun, dimensiones: () => ({ ancho: 1000, alto: 700 }) });
  assert.deepEqual(r.map((i) => i.url), ['/fotos-notas/a.jpg', '/opengraph-image']);
  assert.equal(r[0].width, 1000);
  assert.equal(r[0].height, 700);
});

test('sin tarjeta y sin foto que sirva, la del sitio (nunca una dirección que no existe)', () => {
  assert.deepEqual(imagenesParaCompartir({ nota: { ...nota, foto: null }, ...comun }), [SITIO]);
  assert.deepEqual(imagenesParaCompartir({ nota, ...comun, dimensiones: () => ({ ancho: 300, alto: 200 }) }), [SITIO]);
  assert.deepEqual(imagenesParaCompartir({ nota, ...comun, dimensiones: () => null }), [SITIO]);
});

test('sin tarjeta propia, el marcado de la nota declara su foto primero y no la tarjeta del sitio, igual para todas', () => {
  const dims = () => ({ ancho: 862, alto: 486 });
  const comunes = { nota, tarjeta: 'https://radarbalcarce.com/opengraph-image', urlFoto: (a) => `https://radarbalcarce.com/${a}`, dimensiones: dims };
  const sin = imagenesDeNota({ ...comunes, tarjetaPropia: false });
  assert.equal(sin[0].url, 'https://radarbalcarce.com/fotos-notas/a.jpg');
  assert.equal(sin[1], 'https://radarbalcarce.com/opengraph-image');
  // Con tarjeta propia, lo de siempre: la tarjeta primero cuando la foto es de menos de 1200 px.
  const con = imagenesDeNota({ ...comunes, tarjeta: 'https://radarbalcarce.com/nota/x/opengraph-image' });
  assert.equal(con[0], 'https://radarbalcarce.com/nota/x/opengraph-image');
  // Sin foto que sirva, sólo la tarjeta.
  assert.deepEqual(imagenesDeNota({ ...comunes, dimensiones: () => null, tarjetaPropia: false }), ['https://radarbalcarce.com/opengraph-image']);
  assert.match(leer('web/components/ficha.js'), /tarjetaPropia: conTarjeta/);
});

test('la descripción de una sección es una frase fija, entera y sin titulares (24/10/2026)', () => {
  for (const s of SECCIONES) {
    const d = descripcionDeSeccion({ nombre: s.nombre });
    assert.ok(d.length >= 60 && d.length <= 155, `${s.nombre} mide ${d.length}`);
    assert.ok(!d.includes('…'), s.nombre);
    assert.ok(d.endsWith('.'), s.nombre);
  }
  // La página 2 lo dice, y nada más cambia.
  const base = descripcionDeSeccion({ nombre: 'Policiales' });
  assert.equal(descripcionDeSeccion({ nombre: 'Policiales', pagina: 2 }), `${base} Página 2.`);
  // Una sección que no conocemos usa la frase de siempre.
  assert.equal(descripcionDeSeccion({ nombre: 'Rareza' }), 'Rareza en Balcarce.');
  // La página ya no le pasa titulares.
  assert.ok(!/titulares/.test(leer('web/app/seccion/[ranura]/page.js').match(/descripcionDeSeccion\(\{[^}]*\}\)/)[0]));
});

test('el editor de la nota lleva nombre, dirección y logo, y el mismo @id del medio', () => {
  const e = editorDeNota(BASE, 'Radar Balcarce');
  assert.equal(e['@type'], 'NewsMediaOrganization');
  assert.equal(e['@id'], `${BASE}/#medio`);
  assert.equal(e.name, 'Radar Balcarce');
  assert.equal(e.logo.url, `${BASE}/icon-512.png`);
  assert.ok(e.logo.width >= 112 && e.logo.height >= 112, 'Google pide un logo de al menos 112 px');
  // La nota lo usa en lugar de la referencia suelta.
  assert.match(leer('web/components/ficha.js'), /publisher: editorDeNota\(base, NOMBRE\)/);
});

test('la nota declara todo lo que Google Noticias pide', () => {
  const f = leer('web/components/ficha.js');
  for (const clave of ['headline:', 'description:', 'datePublished:', 'dateModified: fechaDeModificacion(nota)', 'isAccessibleForFree: true', 'author: autorDeNota', 'publisher:', 'mainEntityOfPage', 'inLanguage', 'camposExtraDeNota']) {
    assert.ok(f.includes(clave), `la ficha de la nota no declara ${clave}`);
  }
  assert.ok(f.includes("'@type': 'NewsArticle'"));
  assert.ok(f.includes("'@type': 'BreadcrumbList'"));
});

test('la ficha de una sección es un CollectionPage con la lista de notas', () => {
  const d = datosDeSeccion({
    base: BASE, camino: '/seccion/salud', nombre: 'Salud en Balcarce: hospital y vacunas', descripcion: 'El hospital.',
    notas: [{ ruta: '/nota/a', titulo: 'A' }, { ruta: '/nota/b', titulo: 'B' }], enlace: (r) => `${BASE}${r}`,
  });
  assert.equal(d['@type'], 'CollectionPage');
  assert.equal(d.url, `${BASE}/seccion/salud`);
  assert.equal(d.mainEntity.numberOfItems, 2);
  assert.deepEqual(d.mainEntity.itemListElement.map((i) => [i.position, i.url]), [[1, `${BASE}/nota/a`], [2, `${BASE}/nota/b`]]);
  // Sin notas no hay lista (no se promete lo que no hay).
  assert.equal(datosDeSeccion({ base: BASE, camino: '/seccion/x', nombre: 'X', descripcion: 'x', notas: [], enlace: (r) => r }).mainEntity, undefined);
  assert.match(leer('web/app/seccion/[ranura]/page.js'), /<FichaDeSeccion /);
});

test('cada sección, las nuevas incluidas, tiene un título que dice qué es y entra en una etiqueta de 62 caracteres', () => {
  assert.ok(SECCIONES.length >= 14);
  const vistos = new Set();
  for (const s of SECCIONES) {
    const t = tituloDeSeccion(s.nombre);
    assert.ok(t.length <= LARGO_MAXIMO_TITULO_DE_SECCION, `${s.nombre}: "${t}" mide ${t.length}`);
    assert.ok(`${t} · Radar Balcarce`.length <= 62, `${s.nombre}: la etiqueta mide ${(`${t} · Radar Balcarce`).length}`);
    assert.ok(t.length > s.nombre.length, `${s.nombre}: el título es igual al nombre pelado`);
    assert.ok(!vistos.has(t), `título repetido: ${t}`);
    assert.ok(!/Balcarce en Balcarce|Argentina en Balcarce/.test(t), t);
    vistos.add(t);
  }
  for (const [nombre, esperado] of [['Educación', /Educación/], ['Salud', /Salud/], ['Ciencia', /Ciencia/], ['Tecnología', /Tecnología e IA/]]) {
    assert.match(tituloDeSeccion(nombre), esperado, nombre);
  }
  // Una sección que no está en la tabla igual tiene un título decente.
  assert.equal(tituloDeSeccion('Sección inventada'), 'Sección inventada en Balcarce');
  assert.equal(nombreCorto('Tecnología'), 'Tecnología e IA');
});

test('la página de sección usa ese título en la etiqueta y deja el h1 como estaba', () => {
  const p = leer('web/app/seccion/[ranura]/page.js');
  assert.match(p, /tituloDeSeccion\(s\.nombre\)/);
  assert.match(p, /<h1 style=\{\{ fontSize: 28 \}\}>\{nombreCorto\(s\.nombre\)\}<\/h1>/);
});

test('cada nota declara su canónico y las etiquetas de Open Graph de un artículo', () => {
  const p = leer('web/app/nota/[id]/page.js');
  for (const clave of ['alternates: { canonical: camino }', "type: 'article'", 'publishedTime: n.fecha', 'modifiedTime: fechaDeModificacion(n)', 'section: n.seccion', 'tags:']) {
    assert.ok(p.includes(clave), `la nota no declara ${clave}`);
  }
});
