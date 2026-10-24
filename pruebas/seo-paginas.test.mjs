// Lo que ve un buscador de nuestras páginas: íconos, títulos, encabezados.
//
// El 24/09 se auditó el sitio publicado y no tenía ícono, la portada y las
// secciones no tenían un h1, las notas tenían títulos de más de 70 caracteres
// y las secciones compartían la misma descripción. Esto vigila que no vuelva.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { recortarEn, descripcionParaBuscador, DESCRIPCION_HOLGURA } from '../web/lib/texto.js';
import { textoDeRobots } from '../web/lib/robots.js';
import {
  metadatosDePagina, autorDeNota, quienEscribio, firmaCorta, explicacionDeFirma, OG_COMUN,
  tituloDeNota, titularDeNota, LARGO_MAXIMO_CON_MARCA,
} from '../web/components/metadatos.js';
import { principiosDeNota } from '../web/lib/datos-estructurados.js';

const RAIZ = path.join(import.meta.dirname, '..', 'web');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');

// ----------------------------------------------------- recortar títulos

test('un texto corto no se toca', () => {
  assert.equal(recortarEn('Un título corto', 60), 'Un título corto');
});

test('un texto largo se corta en una palabra entera y termina en puntos suspensivos', () => {
  const r = recortarEn('Ferroviarios se consagró campeón de básquet en una final apretadísima', 40);
  assert.ok(r.length <= 40, `mide ${r.length}`);
  assert.ok(r.endsWith('…'));
  assert.ok(!/\s…$/.test(r), 'dejó un espacio antes de los puntos');
  assert.ok('Ferroviarios se consagró campeón de básquet en una final apretadísima'.startsWith(r.slice(0, -1)), 'cortó por la mitad de una palabra');
});

test('no deja una coma ni un guion colgando antes de los puntos', () => {
  const r = recortarEn('Balcarce, la ciudad de Fangio, recibe a los pilotos - y a todo el país', 32);
  assert.ok(!/[,\-–—.;:]…$/.test(r), r);
});

test('espacios de sobra y saltos de línea se limpian', () => {
  assert.equal(recortarEn('  Una   nota\n con  espacios  ', 60), 'Una nota con espacios');
});

// ------------------------------------------------------------- íconos

test('están todos los íconos que piden los navegadores y los celulares', () => {
  for (const f of ['favicon.ico', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'manifest.webmanifest']) {
    assert.ok(fs.existsSync(path.join(RAIZ, 'public', f)), `falta web/public/${f}`);
  }
});

test('favicon.ico es un ícono de verdad, con varios tamaños', () => {
  const b = fs.readFileSync(path.join(RAIZ, 'public', 'favicon.ico'));
  assert.equal(b.readUInt16LE(0), 0, 'cabecera');
  assert.equal(b.readUInt16LE(2), 1, 'no es un .ico');
  assert.ok(b.readUInt16LE(4) >= 2, 'tiene un solo tamaño');
});

test('los PNG son cuadrados y del tamaño que dicen', () => {
  for (const [f, t] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
    const b = fs.readFileSync(path.join(RAIZ, 'public', f));
    assert.equal(b.subarray(1, 4).toString(), 'PNG');
    assert.equal(b.readUInt32BE(16), t, `${f}: ancho`);
    assert.equal(b.readUInt32BE(20), t, `${f}: alto`);
  }
});

test('el manifiesto apunta a íconos que existen', () => {
  const m = JSON.parse(leer('public/manifest.webmanifest'));
  assert.equal(m.name, 'Radar Balcarce');
  for (const i of m.icons) assert.ok(fs.existsSync(path.join(RAIZ, 'public', i.src.replace(/^\//, ''))), i.src);
});

test('el layout declara los íconos y el manifiesto', () => {
  const l = leer('app/layout.js');
  for (const s of ['/favicon.ico', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/manifest.webmanifest']) {
    assert.ok(l.includes(s), `el layout no menciona ${s}`);
  }
});

// -------------------------------------------------- encabezados y títulos

test('la portada tiene un h1 y un título que dice qué es', () => {
  const p = leer('app/page.js');
  assert.match(p, /<h1 className="solo-lectores">/);
  assert.match(p, /absolute: 'Radar Balcarce · Noticias de Balcarce/);
});

test('cada página de sección tiene un h1 y su propia tarjeta para compartir', () => {
  assert.match(leer('app/seccion/[ranura]/page.js'), /<h1 style=\{\{ fontSize: 28 \}\}>/);
  assert.ok(fs.existsSync(path.join(RAIZ, 'app/seccion/[ranura]/opengraph-image.js')));
});

test('la descripción de una sección es fija y propia de cada una: no es igual para todas ni pega el último titular', () => {
  const s = leer('app/seccion/[ranura]/page.js');
  assert.match(s, /descripcionDeSeccion\(\{ nombre: s\.nombre, pagina \}\)/);
  assert.ok(!/ultimas/.test(s));
  assert.ok(!s.includes('Todo lo que publicamos en ${nombreCorto(s.nombre)}, en Radar Balcarce.'));
});

// D5 (16/10/2026): antes esta prueba exigía recortarEn(titulo, 60) y recortarEn(copete, 155). Ya no: el 72 % de los títulos llegaba a
// Google con "…" puesto por nosotros. Ahora el titular va entero y la descripción se corta, si hace falta, en un final de oración
// (ver "D5" más abajo para las pruebas con titulares reales).
test('el título y la descripción de las notas ya no se recortan a mano a 60 caracteres', () => {
  const n = leer('app/nota/[id]/page.js');
  assert.match(n, /title: \{ absolute: tituloDeNota\(n\.titulo\) \}/);
  assert.match(n, /descripcionParaBuscador\(n\.copete/);
  assert.ok(!/recortarEn/.test(n), 'la página de la nota volvió a recortar con recortarEn');
});

test('las analíticas de Vercel ya no están: en Cloudflare pedían un archivo que no existe', () => {
  assert.ok(!leer('app/layout.js').includes('@vercel/analytics'));
  assert.ok(!leer('package.json').includes('@vercel/analytics'));
});

// ------------------------------------------------ auditoría del 25/09
//
// Lo que encontró la auditoría del 25/09 sobre el sitio publicado: páginas
// con el canónico de la portada, textos que prometían una revisión humana
// que no hubo, la tarjeta para compartir servida como un archivo cualquiera,
// sin páginas de "quiénes somos" ni de contacto, y detalles de accesibilidad.

/** Todos los archivos de una carpeta de web/, con su camino relativo. */
function archivos(carpeta) {
  const salida = [];
  const recorrer = (rel) => {
    for (const e of fs.readdirSync(path.join(RAIZ, rel), { withFileTypes: true })) {
      const r = path.join(rel, e.name);
      if (e.isDirectory()) recorrer(r);
      else salida.push(r.split(path.sep).join('/'));
    }
  };
  recorrer(carpeta);
  return salida;
}

test('el layout no le pone el canónico de la portada a todo el sitio', () => {
  const l = leer('app/layout.js');
  assert.ok(!/canonical\s*:/.test(l), 'el layout declara un canonical: lo heredan todas las páginas que no declaran el suyo');
  assert.ok(!/url:\s*'\/'/.test(l), 'el layout pone og:url = portada para todo el sitio');
});

test('cada página declara su propio canónico, y sólo la portada es "/"', () => {
  const paginas = archivos('app').filter((f) => f.endsWith('/page.js'));
  assert.ok(paginas.length >= 8, `encontré ${paginas.length} páginas`);
  for (const p of paginas) {
    const t = leer(p);
    const declara = /canonical\s*:/.test(t) || /metadatosDePagina\(/.test(t);
    assert.ok(declara, `${p} no declara canónico: heredaría el del layout`);
    const esPortada = /camino:\s*'\/'/.test(t) || /canonical:\s*'\/'/.test(t);
    if (p === 'app/page.js') assert.ok(esPortada, 'la portada tiene que tener canónico "/"');
    else assert.ok(!esPortada, `${p} tiene el canónico de la portada`);
  }
});

test('metadatosDePagina: canónico, og:url, tarjeta, nombre del sitio e idioma', () => {
  const m = metadatosDePagina({ titulo: 'Farmacias de turno', descripcion: 'x', camino: '/farmacias' });
  assert.equal(m.alternates.canonical, '/farmacias');
  assert.equal(m.openGraph.url, '/farmacias');
  assert.equal(m.openGraph.siteName, 'Radar Balcarce');
  assert.equal(m.openGraph.locale, 'es_AR');
  assert.equal(m.openGraph.images[0].url, '/opengraph-image');
  assert.equal(m.title, 'Farmacias de turno');
  assert.throws(() => metadatosDePagina({ titulo: 'x', descripcion: 'x', camino: 'farmacias' }));
});

test('las secciones y los temas no pierden el nombre del sitio ni el idioma al compartir', () => {
  assert.deepEqual(OG_COMUN, { siteName: 'Radar Balcarce', locale: 'es_AR' });
  for (const p of ['app/seccion/[ranura]/page.js', 'app/tema/[ranura]/page.js']) {
    assert.match(leer(p), /openGraph: \{ \.\.\.OG_COMUN,/, p);
  }
});

test('ningún título repite la marca: la plantilla del layout ya la agrega', () => {
  for (const p of archivos('app').filter((f) => f.endsWith('page.js'))) {
    const sinAbsolutos = leer(p).replace(/absolute:[^}]*/g, '');
    assert.ok(!/(title|titulo):\s*'[^']*· Radar Balcarce'/.test(sinAbsolutos), `${p} pone "· Radar Balcarce" en el título`);
  }
});

// ------------------------------------------------ lo que decimos de la IA

test('no volvemos a prometer una revisión humana que no hay', () => {
  const textos = [...archivos('app'), ...archivos('components')].filter((f) => /\.(js|mjs|jsx)$/.test(f));
  for (const f of textos) {
    const t = leer(f);
    assert.ok(!/siempre con revisi[oó]n humana/i.test(t), `${f} dice "siempre con revisión humana"`);
    assert.ok(!/con revisi[oó]n humana/i.test(t), `${f} dice "con revisión humana"`);
    assert.ok(!/resumen autom[aá]tico con revisi[oó]n/i.test(t), `${f} dice "resumen automático con revisión"`);
  }
  const perfiles = fs.readFileSync(path.join(RAIZ, '..', 'PERFILES.md'), 'utf8');
  assert.ok(!/revisi[oó]n humana/i.test(perfiles), 'PERFILES.md promete revisión humana en las biografías');
});

test('el autor de los datos estructurados dice lo mismo que la firma de la nota', () => {
  // D5 (16/10/2026): antes el nombre era "Radar Balcarce (nota escrita con IA y …)". La guía de Google pide sólo el nombre; la
  // aclaración sobre la IA sigue en el marcado, en author.description (y en publishingPrinciples de la nota), y la firma visible no cambió.
  const auto = autorDeNota({ guion: 'x', como: 'automatica', medios: ['La Vanguardia'] }, 'https://radarbalcarce.com');
  assert.equal(auto.name, 'Radar Balcarce');
  // 23/10/2026: el autor es sólo el nombre y su página; cómo se escribe va adentro de «Fuentes» y en «Cómo trabajamos».
  assert.equal(auto.description, undefined);

  const revisada = autorDeNota({ guion: 'x', como: 'publicada' }, 'https://radarbalcarce.com');
  assert.equal(revisada.name, 'Radar Balcarce');
  assert.equal(revisada.description, undefined);

  // El resumen es el de la fuente: el autor es ese medio.
  assert.equal(autorDeNota({ guion: null, como: 'automatica', medios: ['El Diario Balcarce'] }).name, 'El Diario Balcarce');
  assert.equal(autorDeNota({ guion: null, como: 'automatica', medios: [] }).name, 'Radar Balcarce');

  assert.deepEqual(quienEscribio({ guion: 'x', como: 'publicada' }), { reescrita: true, revisada: true });
  assert.deepEqual(quienEscribio({ guion: null, como: 'automatica' }), { reescrita: false, revisada: false });

  assert.match(leer('components/ficha.js'), /author: autorDeNota\(nota, base\)/);
  assert.match(leer('components/metadatos.js'), /export function firmaCorta[\s\S]*quienEscribio\(nota\)/);
  assert.match(leer('components/verificacion.js'), /firmaCorta\(nota\)/);
});

test('la firma que ve el lector es una línea corta, coherente con el autor de los datos', () => {
  const auto = { guion: 'x', como: 'automatica', medios: ['La Vanguardia'] };
  assert.equal(firmaCorta(auto), 'Redacción asistida con IA, verificada contra las fuentes');
  assert.equal(firmaCorta({ ...auto, como: 'publicada' }), 'Redacción asistida con IA, revisada por la redacción');
  assert.equal(firmaCorta({ guion: null, como: 'publicada' }), 'Revisada por la redacción');
  assert.equal(firmaCorta({ guion: null, como: 'automatica', medios: ['El Diario Balcarce'] }), 'Texto de El Diario Balcarce');
  assert.equal(firmaCorta({ guion: null, como: 'automatica', medios: [] }), 'Texto de la fuente');
  assert.equal(firmaCorta({ propia: true, firma: 'Nota de Radar Balcarce con datos de DolarApi.com a las 11:07.' }),
    'Nota de Radar Balcarce con datos de DolarApi.com a las 11:07');
  // Lo interno no se le dice al lector, y ninguna firma es un párrafo.
  for (const n of [auto, { ...auto, como: 'publicada' }, { guion: null, como: 'automatica', medios: ['X'] }]) {
    assert.ok(!/sin revisi[oó]n humana/i.test(firmaCorta(n) + explicacionDeFirma(n)));
    assert.ok(firmaCorta(n).length <= 60, `demasiado larga: ${firmaCorta(n)}`);
  }
  // Una automática nunca dice que la revisó una persona.
  assert.ok(!/revis/i.test(firmaCorta(auto)));
  assert.ok(!/revis/i.test(explicacionDeFirma(auto)));
  // La explicación larga existe (va al abrir el desplegable) y no en las propias.
  assert.match(explicacionDeFirma(auto), /inteligencia artificial/);
  assert.equal(explicacionDeFirma({ propia: true }), null);
  // El componente (17/10/2026, Hernán): arriba sólo "Fuentes (N)"; la firma va adentro del desplegable, y el párrafo largo no está en la página cerrada.
  const verificacion = leer('components/verificacion.js');
  assert.match(verificacion, /<summary>\s*<span className="fn-n">Fuentes \(\{fuentes\.length\}\)<\/span>\s*<\/summary>/);
  assert.match(verificacion, /<p className="fn-explica">\s*<strong className="fn-firma">\{firma\}\.<\/strong>/);
  assert.ok(!/Salió sin revisión humana/.test(leer('components/piezas.js') + verificacion + leer('components/metadatos.js')));
});

// ------------------------------------------------ encabezados de Cloudflare

test('_headers: la tarjeta para compartir sale como imagen, y los encabezados de seguridad y caché', () => {
  const h = leer('public/_headers');
  const reglas = {};
  let actual = null;
  for (const linea of h.split(/\r?\n/)) {
    if (!linea.trim() || linea.trim().startsWith('#')) continue;
    if (!/^\s/.test(linea)) { actual = linea.trim(); reglas[actual] = {}; continue; }
    const [k, ...v] = linea.trim().split(':');
    reglas[actual][k.trim().toLowerCase()] = v.join(':').trim();
  }

  // Todas las tarjetas que genera la app (opengraph-image.js o
  // twitter-image.js en cualquier carpeta), como las ve Cloudflare.
  const tarjetas = archivos('app')
    .map((f) => f.replace(/(\/opengraph-image)\/route\.js$/, '$1.js'))
    .filter((f) => /(^|\/)(opengraph|twitter)-image\.js$/.test(f))
    .map((f) => f.replace(/^app/, '').replace(/\.js$/, '').replace(/\[[^\]]+\]/g, '*'));
  assert.ok(tarjetas.includes('/opengraph-image'));
  assert.ok(tarjetas.includes('/nota/*/opengraph-image'));
  for (const t of tarjetas) {
    assert.equal(reglas[t]?.['content-type'], 'image/png', `${t} no tiene Content-Type: image/png`);
  }

  const todo = reglas['/*'];
  assert.ok(todo, 'falta la regla /*');
  assert.match(todo['strict-transport-security'], /max-age=31536000/);
  assert.equal(todo['x-content-type-options'], 'nosniff');
  assert.equal(todo['x-frame-options'], 'SAMEORIGIN');
  assert.equal(todo['referrer-policy'], 'strict-origin-when-cross-origin');
  for (const p of ['camera=()', 'microphone=()', 'geolocation=()']) assert.ok(todo['permissions-policy'].includes(p), p);
  // Una CSP estricta rompería el beacon de Cloudflare y el JSON-LD en línea.
  if (todo['content-security-policy']) assert.equal(todo['content-security-policy'], "frame-ancestors 'self'");

  assert.equal(reglas['/_next/static/*']?.['cache-control'], 'public, max-age=31536000, immutable');
});

test('el sitio se exporta como archivos estáticos, así _headers llega a lo publicado', () => {
  assert.match(leer('next.config.mjs'), /output: 'export'/);
});

// ------------------------------------------------ páginas de confianza

test('están "Quiénes somos" y "Contacto", con h1, enlazadas desde el pie y en el sitemap', () => {
  const l = leer('app/layout.js');
  const s = leer('app/sitemap.js');
  for (const camino of ['/quienes-somos', '/contacto']) {
    const p = leer(`app${camino}/page.js`);
    assert.match(p, /<h1/, `${camino} no tiene h1`);
    assert.ok(p.includes(`camino: '${camino}'`), `${camino} no declara su canónico`);
    assert.ok(l.includes(`href="${camino}"`), `el pie no enlaza a ${camino}`);
    assert.ok(s.includes(`\${base}${camino}`), `el sitemap no incluye ${camino}`);
  }
  // El contacto usa el correo y el WhatsApp que ya publica el sitio.
  assert.match(leer('app/contacto/page.js'), /MAIL/);
});

// ------------------------------------------------ detalles

test('el idioma es castellano de Argentina y el medio tiene logo', () => {
  assert.match(leer('app/layout.js'), /<html lang="es-AR">/);
  assert.match(leer('app/layout.js'), /locale: 'es_AR'/);
  const f = leer('components/ficha.js');
  assert.match(f, /logo: \{/);
  assert.match(f, /icon-512\.png/);
});

test('el campo del buscador tiene un nombre para los lectores de pantalla', () => {
  const campo = leer('components/buscador.js').match(/<input[\s\S]*?\/>/)?.[0] ?? '';
  assert.match(campo, /aria-label="[^"]+"/);
});

test('las etiquetas de sección se leen: blanco sobre el color de la sección, al menos 4,5:1', () => {
  const css = leer('app/globals.css');
  const colores = [...css.matchAll(/--s-([a-z]+):\s*(#[0-9A-Fa-f]{6})/g)];
  assert.ok(colores.length >= 10, `encontré ${colores.length} colores de sección`);
  const lum = (h) => {
    const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  for (const [, nombre, color] of colores) {
    const contraste = 1.05 / (lum(color) + 0.05);
    assert.ok(contraste >= 4.5, `--s-${nombre} (${color}) da ${contraste.toFixed(2)}:1 con blanco`);
  }
});

test('el sitemap de noticias deja afuera las notas sin fecha real', () => {
  // Cuando la fuente no da hora, `fecha` es la primera vez que la vimos: el
  // 25/09 diecinueve notas salían con la misma hora de relleno.
  // Desde el 17/10 (regla 250) la cuenta está en lib/sitemap-noticias.js y se prueba en pruebas/sitemaps-noticias.test.mjs.
  assert.match(leer('app/sitemap-news.xml/route.js'), /xmlDeNoticias\(/);
  assert.match(leer('lib/sitemap-noticias.js'), /\.filter\(\(n\) => n && n\.ruta && n\.titulo && !n\.sinFecha/);
});

// ------------------------------- el criterio de presentación (26/09)

test('el criterio editorial recoge las reglas de presentación de toda página', async () => {
  const fs = await import('node:fs');
  const md = fs.readFileSync(new URL('../CRITERIO-EDITORIAL.md', import.meta.url), 'utf8');
  for (const frase of ['Una sola línea de firma', 'Las fuentes, plegadas', 'El análisis es interno', 'No se copia texto de otro', 'Nada de "en vivo"', 'Una tipografía, un sistema']) {
    assert.ok(md.includes(frase), `falta en el criterio: ${frase}`);
  }
});

test('ninguna página del sitio lleva la firma larga ni "en vivo" (fuente: el código)', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const recorrer = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? recorrer(p) : /\.(js|mjs)$/.test(e.name) ? [p] : [];
  });
  const { fileURLToPath } = await import('node:url');
  const raiz = fileURLToPath(new URL('../web/', import.meta.url));
  const archivos = [...recorrer(path.join(raiz, 'app')), ...recorrer(path.join(raiz, 'components'))];
  const prohibidas = [/Esta ficha se arm/, /Salió sin revisión humana/, /No la escribió una inteligencia/, /De dónde sale esta nota/, /Lo que cuenta la Municipalidad/];
  for (const a of archivos) {
    const texto = fs.readFileSync(a, 'utf8');
    for (const re of prohibidas) assert.ok(!re.test(texto), `${path.relative(raiz, a)} tiene un texto que ya no va: ${re}`);
  }
});

// ------- 29/09: la imagen para compartir de cada nota tiene que existir
test('cada nota declara una tarjeta que existe: la propia si la tiene y, si no, la del sitio', () => {
  const pagina = leer('app/nota/[id]/page.js');
  // 17/10/2026 (regla 251): la elige imagenesParaCompartir (lib/datos-estructurados.js): la tarjeta propia, o la foto de la nota archivada, o la del sitio.
  assert.match(pagina, /tarjeta: tieneTarjetaPropia\(n\)/);
  assert.match(pagina, /tarjetaDelSitio: TARJETA_DEL_SITIO/);
  assert.match(pagina, /images: imagenes,/, 'og:image declarada a mano');
  assert.match(pagina, /images: \[\{ url: imagen\.url, alt: imagen\.alt \}\]/, 'twitter:image igual que la primera og:image');
  assert.match(pagina, /<FichaDeNota nota=\{n\} conTarjeta=\{tieneTarjetaPropia\(n\)\} \/>/);
  assert.match(leer('components/ficha.js'), /enlace\(conTarjeta \? `\$\{nota\.ruta\}\/opengraph-image` : '\/opengraph-image'\)/);
  // La tarjeta apaisada es una ruta: con el archivo especial opengraph-image.js, Next declaraba la
  // etiqueta en todas las notas, tuvieran tarjeta o no.
  assert.ok(!fs.existsSync(path.join(RAIZ, 'app/nota/[id]/opengraph-image.js')));
  assert.ok(fs.existsSync(path.join(RAIZ, 'app/nota/[id]/opengraph-image/route.js')));
  // Y el control de antes de publicar mira todas las notas.
  const control = leer('scripts/revisar-seo.mjs');
  assert.match(control, /de \$\{paginas\.length\} notas con la imagen para compartir rota/);
});

test('fechaDeModificacion: nunca anterior a la de publicación (12 notas lo estaban)', async () => {
  const { fechaDeModificacion, haceCuanto } = await import('../web/lib/tiempo.js');
  const n = { fecha: '2026-09-28T22:30:00.000Z', publicadaCuando: '2026-09-27T22:18:00.000Z' };
  assert.equal(fechaDeModificacion(n), '2026-09-28T22:30:00.000Z');
  assert.equal(fechaDeModificacion({ fecha: '2026-09-28T22:30:00.000Z', publicadaCuando: '2026-09-29T01:00:00.000Z' }), '2026-09-29T01:00:00.000Z');
  assert.equal(fechaDeModificacion({ fecha: '2026-09-28T22:30:00.000Z' }), '2026-09-28T22:30:00.000Z');
  // haceCuanto redondea hacia abajo: 1 h 30 es "hace 1 h", y 36 horas son "ayer".
  const ahora = Date.parse('2026-09-29T12:00:00Z');
  assert.equal(haceCuanto('2026-09-29T10:30:00Z', ahora), 'hace 1 h');
  assert.equal(haceCuanto('2026-09-28T00:00:00Z', ahora), 'ayer');
  assert.equal(haceCuanto('2026-09-29T11:20:00Z', ahora), 'hace 40 min');
});

// ------- 29/09: más arreglos de la auditoría del sitio en vivo
// 29/09 fijaba "sin marca y recortado a 60"; D5 (16/10/2026) lo cambia: titular entero, y la marca sólo si todo entra en 70 caracteres.
test('el título de la nota es el titular entero, con la marca sólo si no pasa de 70 caracteres', () => {
  assert.match(leer('app/nota/[id]/page.js'), /title: \{ absolute: tituloDeNota\(n\.titulo\) \}/);
  assert.equal(LARGO_MAXIMO_CON_MARCA, 70);
});

test('una sección sin notas hoy se genera igual, con noindex, y no da 404 ("Ver todo →" de la nota)', () => {
  const seccion = leer('app/seccion/[ranura]/page.js');
  assert.match(seccion, /const paginas = Math\.max\(1, cuantasPaginas\(cuantas\)\);/);
  assert.match(seccion, /robots: \{ index: false, follow: true \}/);
  assert.ok(!/if \(todas\.length === 0\) notFound\(\);/.test(seccion), 'volvió el 404 de las secciones vacías');
});

test('las fotos de las notas: proporción fija y caché de una semana', () => {
  assert.match(leer('app/nota/[id]/page.js'), /aspectRatio: '16 \/ 9'/);
  const h = leer('public/_headers').replace(/\r\n/g, '\n');
  assert.match(h, /\/fotos-notas\/\*\n  Cache-Control: public, max-age=604800/);
});

test('etiquetasDeFuentes numera el medio que se repite', async () => {
  const { etiquetasDeFuentes } = await import('../web/lib/fuentes-de-la-nota.js');
  const f = [{ medio: 'Infobae' }, { medio: 'La Nación' }, { medio: 'Infobae' }, { medio: null }, { medio: 'Infobae' }];
  assert.deepEqual(etiquetasDeFuentes(f), ['Infobae (1)', 'La Nación', 'Infobae (2)', 'Nota original', 'Infobae (3)']);
  assert.deepEqual(etiquetasDeFuentes([{ medio: 'Clarín' }]), ['Clarín']);
});

test('Hoy en Balcarce: flechas del teclado, una sola pestaña en el orden de Tab y sin NaN', () => {
  const hoy = leer('components/hoy-balcarce.js');
  assert.match(hoy, /ArrowRight/);
  assert.match(hoy, /ArrowLeft/);
  assert.match(hoy, /tabIndex=\{activa === p\.id \? 0 : -1\}/);
  assert.match(hoy, /Number\.isFinite\(a\.temp\)/);
  assert.match(hoy, /aria-label="Servicios de hoy"/);
});

// S-1 / W-5 (8/10/2026): las notas automáticas sin cuerpo (las 296 del 18 al 25/09) no se ofrecen a Google.
test('una nota automática sin cuerpo lleva noindex, follow; con cuerpo o publicada por una persona, no', async () => {
  const { noSeOfreceAGoogle } = await import('../web/lib/cuerpo.js');
  const cuerpo = 'palabra '.repeat(80).trim();
  assert.equal(noSeOfreceAGoogle({ como: 'automatica', copete: 'La bajada', cuerpo: 'La bajada' }), true);
  assert.equal(noSeOfreceAGoogle({ copete: 'La bajada', cuerpo: '' }), true, 'las viejas, sin "como"');
  assert.equal(noSeOfreceAGoogle({ como: 'automatica', copete: 'La bajada', cuerpo }), false);
  assert.equal(noSeOfreceAGoogle({ como: 'publicada', copete: 'La bajada', cuerpo: 'corto' }), false, 'lo que publica una persona se respeta');
  const pagina = fs.readFileSync(path.join(import.meta.dirname, '..', 'web/app/nota/[id]/page.js'), 'utf8');
  assert.match(pagina, /noSeOfreceAGoogle\(n\) \? \{ robots: \{ index: false, follow: true \} \}/);
});

// V2-13 (8/10/2026): Google usa el feed para descubrir notas; robots.txt no lo bloquea. El panel sí sigue bloqueado.
test('robots.txt deja pasar el feed y bloquea el panel', () => {
  const robots = textoDeRobots({ base: 'https://radarbalcarce.com', propio: true });
  assert.match(robots, /^User-agent: \*\nContent-Signal: [^\n]*\nAllow: \/\nDisallow: \/panel\/$/m);
  assert.ok(!/Disallow:[^\n]*feed\.xml/.test(robots), 'el feed no se bloquea');
  assert.ok(!/^\s*host:/mi.test(robots), 'sin la línea Host:');
});

// SEO (8/10/2026): las secciones no dicen "Balcarce en Balcarce" ni "Argentina en Balcarce".
test('la frase de cada sección tiene sentido y ninguna repite "Balcarce en Balcarce"', async () => {
  const fs2 = await import('node:fs');
  const datos = fs2.readFileSync(path.join(import.meta.dirname, '..', 'web/lib/datos.js'), 'utf8');
  const bloque = datos.slice(datos.indexOf('export function frasesDeSeccion'), datos.indexOf('// Un nombre corto para la navegación'));
  assert.ok(!/Balcarce en Balcarce|Argentina en Balcarce/.test(bloque));
  for (const s of ['Balcarce', 'Política', 'Policiales', 'Fútbol', 'Deportes', 'Automovilismo', 'Agro', 'Economía', 'Cultura y agenda', 'Tecnología', 'Argentina']) {
    assert.ok(bloque.includes(`${s.includes(' ') ? `'${s}'` : s}: {`), `falta la frase de ${s}`);
  }
  assert.match(fs2.readFileSync(path.join(import.meta.dirname, '..', 'web/app/seccion/[ranura]/page.js'), 'utf8'), /frasesDeSeccion\(s\.nombre\)\.lema/);
  assert.match(fs2.readFileSync(path.join(import.meta.dirname, '..', 'web/app/seccion/[ranura]/opengraph-image.js'), 'utf8'), /frasesDeSeccion\(s\.nombre\)\.enBalcarce/);
});

test('el sitemap no dice "cambió ahora" en cada armado ni ofrece las páginas de tema (8/10)', () => {
  const s = leer('app/sitemap.js');
  const fijas = s.slice(s.indexOf('const fijas'), s.indexOf('// Una entrada por página de sección'));
  assert.ok(!fijas.includes('new Date()'), 'las páginas fijas usan la fecha de los datos o ninguna');
  assert.ok(!s.includes('/tema/'), 'los temas son páginas finas: fuera del sitemap');
  for (const r of ['quienes-somos', 'contacto', 'politica-de-privacidad']) assert.ok(s.includes('/' + r + '`, changeFrequency'), `${r} no lleva fecha`);
});

// ------------------------------------------------ D5 (16/10/2026): título entero y autor sólo con el nombre
//
// Invisible para el lector: sólo cambia lo que ve Google. Se prueba con los titulares y bajadas reales de web/data/archivo.json.

const NOTAS_REALES = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', 'archivo.json'), 'utf8')).notas.filter((n) => n.titulo);
const TITULARES = [...new Set(NOTAS_REALES.map((n) => n.titulo))];

test('D5: el archivo real tiene titulares largos para probar (si no, la prueba no prueba nada)', () => {
  assert.ok(TITULARES.filter((t) => t.length > 60).length >= 50, 'no hay titulares de más de 60 caracteres');
  assert.ok(TITULARES.filter((t) => t.length > 90).length >= 1, 'no hay titulares de más de 90 caracteres');
});

test('D5: el <title> lleva el titular entero: nunca termina en "…" puesto por nosotros ni se inventa texto', () => {
  for (const t of TITULARES) {
    const limpio = titularDeNota(t);
    const titulo = tituloDeNota(t);
    // O es el titular solo, o el titular y la marca; en los dos casos el titular está completo y al principio.
    assert.ok(titulo === limpio || titulo === `${limpio} · Radar Balcarce`, `título inventado: "${titulo}" para "${t}"`);
    // Si el titular cabe entero (siempre), el título no termina en puntos suspensivos salvo que el propio titular ya terminara así.
    if (!limpio.endsWith('…')) assert.ok(!titulo.endsWith('…'), `termina cortado: ${titulo}`);
    // La marca sólo se suma si no pasa de 70.
    if (titulo !== limpio) assert.ok(titulo.length <= LARGO_MAXIMO_CON_MARCA, `con la marca pasa de 70: ${titulo}`);
    else assert.ok(`${limpio} · Radar Balcarce`.length > LARGO_MAXIMO_CON_MARCA, `faltó la marca en un titular corto: ${limpio}`);
  }
});

test('D5: ejemplos concretos del título (largo sin marca, corto con marca, espacios limpios)', () => {
  const largo = 'F1: Max Verstappen largará desde la pole en el Gran Premio de Singapur; así quedó la parrilla';
  assert.equal(tituloDeNota(largo), largo, 'un titular largo va entero y sin marca');
  assert.ok(largo.length > 60 && !tituloDeNota(largo).includes('…'));
  assert.equal(tituloDeNota('Se juega la fecha del clásico'), 'Se juega la fecha del clásico · Radar Balcarce');
  assert.equal(tituloDeNota('  Un   titular\n con  espacios '), 'Un titular con espacios · Radar Balcarce');
  assert.equal(tituloDeNota(''), 'Radar Balcarce');
  // Justo en el límite: 70 con la marca entra, 71 no.
  const marca = ' · Radar Balcarce'.length;
  assert.ok(tituloDeNota('a'.repeat(LARGO_MAXIMO_CON_MARCA - marca)).endsWith('· Radar Balcarce'));
  assert.ok(!tituloDeNota('a'.repeat(LARGO_MAXIMO_CON_MARCA - marca + 1)).includes('Radar Balcarce'));
});

test('D5: la descripción no se corta si es corta, y si se corta es el principio exacto del texto, sin "…" de más', () => {
  const corto = 'Una bajada corta que entra de sobra.';
  assert.equal(descripcionParaBuscador(corto), corto);
  // Hasta la holgura (160) va entera, aunque pase de 155.
  const justo = 'palabra '.repeat(19).trim() + ' final'; // 157
  assert.ok(justo.length > 155 && justo.length <= DESCRIPCION_HOLGURA);
  assert.equal(descripcionParaBuscador(justo), justo);

  let conPuntos = 0;
  let conFinDeOracion = 0;
  for (const n of NOTAS_REALES) {
    const original = String(n.copete || '').replace(/\s+/g, ' ').trim();
    if (!original) continue;
    const d = descripcionParaBuscador(original);
    if (original.length <= DESCRIPCION_HOLGURA) { assert.equal(d, original, 'se tocó una bajada que entraba'); continue; }
    assert.ok(d.length <= DESCRIPCION_HOLGURA, `pasa de ${DESCRIPCION_HOLGURA}: ${d}`);
    if (d.endsWith('…')) {
      conPuntos += 1;
      // Cortada en una palabra entera: lo que sigue en el original es un espacio.
      const base = d.slice(0, -1);
      assert.ok(original.startsWith(base), `inventó texto: ${d}`);
      assert.ok(!/[\p{L}\p{N}]/u.test(original.charAt(base.length)), `cortó una palabra por la mitad: ${d}`);
      assert.ok(!/[\s,.;:–—-]…$/.test(d), `deja un signo colgando: ${d}`);
    } else {
      conFinDeOracion += 1;
      assert.ok(original.startsWith(d), `inventó texto: ${d}`);
      assert.match(d, /[.!?]["”»')\]]*$/, `no termina en una oración: ${d}`);
      assert.ok(d.length >= 70, `demasiado corta: ${d}`);
    }
  }
  assert.ok(conPuntos + conFinDeOracion > 100, 'no hubo bajadas largas para probar');
  assert.ok(conFinDeOracion > 0, 'ninguna bajada real se cortó en un final de oración');
});

test('D5: la descripción no corta en una abreviatura ni en un decimal', () => {
  const t = 'El intendente se reunió con el Dr. Pérez y la Lic. Gómez para ver el avance de la obra en el barrio, que según el informe llegó al 5.2 por ciento del total previsto para el año';
  const d = descripcionParaBuscador(t);
  assert.ok(t.startsWith(d.replace(/…$/, '')));
  assert.ok(!/(Dr|Lic)\.$/.test(d), `cortó en una abreviatura: ${d}`);
  assert.ok(!/5\.$/.test(d), `cortó en un decimal: ${d}`);
});

test('D5: og:title y twitter:title llevan el titular entero y la página usa las mismas funciones', () => {
  const n = leer('app/nota/[id]/page.js');
  assert.match(n, /const titular = titularDeNota\(n\.titulo\)/);
  assert.match(n, /openGraph: \{[\s\S]*?title: titular,/);
  assert.match(n, /twitter: \{ card: 'summary_large_image', title: titular,/);
  assert.ok(!/title: n\.titulo,/.test(n), 'og:title o twitter:title volvió a usar n.titulo sin limpiar');
});

test('D5: el autor es sólo "Radar Balcarce", y la transparencia sobre la IA sigue en otro lugar del marcado', () => {
  const base = 'https://radarbalcarce.com';
  for (const nota of [
    { guion: 'x', como: 'automatica', medios: ['La Vanguardia'] },
    { guion: 'x', como: 'publicada', medios: ['La Vanguardia'] },
  ]) {
    const a = autorDeNota(nota, base);
    assert.equal(a.name, 'Radar Balcarce');
    assert.ok(!/[()]/.test(a.name));
    assert.equal(a.url, `${base}/quienes-somos`, 'el autor conserva la página de Quiénes somos');
    assert.equal(a.description, undefined, 'desde el 23/10 el autor es sólo el nombre y su página: cómo se escribe va adentro de «Fuentes»');
    // La política de firmas de la nota apunta a "Cómo trabajamos".
    assert.deepEqual(principiosDeNota(quienEscribio(nota), base), { publishingPrinciples: `${base}/quienes-somos#como-trabajamos` });
  }
  // Una nota que no escribió la IA no lleva esa aclaración.
  assert.deepEqual(principiosDeNota(quienEscribio({ guion: null, como: 'automatica', medios: ['X'] }), base), {});
  assert.equal(autorDeNota({ propia: true }, base).description, undefined);
  assert.match(leer('components/ficha.js'), /\.\.\.principiosDeNota\(quienEscribio\(nota\), base\)/);
  // La firma visible no se tocó: sigue diciendo que la escribió la IA.
  assert.equal(firmaCorta({ guion: 'x', como: 'automatica', medios: ['X'] }), 'Redacción asistida con IA, verificada contra las fuentes');
});
