// Revisa que el sitio compilado siga teniendo lo que necesita para que
// Google lo entienda y WhatsApp lo muestre.
//
//   node scripts/revisar-seo.mjs
//
// Corre en GitHub Actions después de compilar y antes de publicar. El motivo
// es concreto: nada de esto se ve mirando la página. Alguien toca layout.js
// dentro de seis meses, se lleva puesto el Open Graph, el sitio sigue
// viéndose perfecto, y nos enteramos cuando alguien comparte una nota y
// llega pelada.
//
// Si falla, el workflow no commitea y la web se queda como está.

import fs from 'node:fs';
import path from 'node:path';
import { parteDeNota } from '../lib/ruta.js';
import { noSeOfreceAGoogle } from '../lib/cuerpo.js';
import { problemasDeVelocidad } from '../lib/auditoria-html.js';

const SALIDA = path.join(process.cwd(), '.next', 'server', 'app');
const fallas = [];

function leer(relativo) {
  try { return fs.readFileSync(path.join(SALIDA, relativo), 'utf8'); } catch { return null; }
}

/** Exige que el HTML tenga cada una de esas cosas. */
function exigir(donde, html, cosas) {
  if (html === null) { fallas.push(`${donde}: no se generó`); return; }
  for (const [que, aguja] of Object.entries(cosas)) {
    if (!html.includes(aguja)) fallas.push(`${donde}: falta ${que}`);
  }
}

// --- La portada -------------------------------------------------------
exigir('la portada', leer('index.html'), {
  'el título': '<title>',
  'la descripción': 'name="description"',
  'el enlace canónico': 'rel="canonical"',
  'og:title': 'property="og:title"',
  'og:image': 'property="og:image"',
  'la tarjeta de Twitter': 'name="twitter:card"',
  'la ficha del medio': 'NewsMediaOrganization',
});

// --- Una nota cualquiera, la primera que haya --------------------------
const datos = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'portada.json'), 'utf8'));
const primera = datos.notas?.[0];

if (!primera) {
  fallas.push('no hay ninguna nota publicada para revisar');
} else {
  const html = leer(path.join('nota', `${parteDeNota(primera)}.html`));
  exigir(`la nota ${primera.id}`, html, {
    'el enlace canónico': 'rel="canonical"',
    'og:title': 'property="og:title"',
    'og:image': 'property="og:image"',
    'og:type article': 'content="article"',
    'la fecha de publicación': 'property="article:published_time"',
    'la ficha NewsArticle': '"@type":"NewsArticle"',
    'el camino de migas': 'BreadcrumbList',
  });

  // La imagen para compartir tiene que existir de verdad, no sólo estar
  // declarada: una etiqueta og:image que apunta a un 404 es peor que nada.
  const imagen = path.join(SALIDA, 'nota', parteDeNota(primera), 'opengraph-image.body');
  if (!fs.existsSync(imagen)) {
    fallas.push(`la nota ${primera.id}: og:image declarada pero la imagen no se generó`);
  } else if (fs.statSync(imagen).size < 4000) {
    fallas.push(`la nota ${primera.id}: la imagen salió vacía o rota`);
  }
}

// La imagen de CADA nota (29/09): hasta esa fecha 7 de cada 10 notas declaraban
// una tarjeta que nunca se generó y compartían un 404 en Facebook y WhatsApp.
// Se controla la que declara cada página, no sólo la de la primera nota.
{
  const carpeta = path.join(SALIDA, 'nota');
  const paginas = fs.existsSync(carpeta) ? fs.readdirSync(carpeta).filter((f) => f.endsWith('.html')) : [];
  const sinImagen = [];
  for (const f of paginas) {
    const html = fs.readFileSync(path.join(carpeta, f), 'utf8');
    const declarada = html.match(/property="og:image" content="([^"]+)"/)?.[1];
    if (!declarada) { sinImagen.push(`${f}: sin og:image`); continue; }
    let ruta;
    try { ruta = new URL(declarada).pathname; } catch { sinImagen.push(`${f}: og:image inválida (${declarada})`); continue; }
    // Una nota archivada comparte su FOTO (regla 251): es un archivo de web/public, no una ruta de Next. Si las fotos van a otro dominio
    // (FOTOS_BASE) no hay nada que mirar acá.
    if (ruta.startsWith('/fotos-notas/')) {
      const foto = path.join(process.cwd(), 'public', ruta.replace(/^\//, ''));
      const deOtroDominio = !!process.env.FOTOS_BASE;
      if (!fs.existsSync(foto)) {
        if (!deOtroDominio) sinImagen.push(`${f}: declara la foto ${ruta} pero no existe`);
      } else if (fs.statSync(foto).size < 4000) {
        sinImagen.push(`${f}: la foto ${ruta} está vacía o rota`);
      }
      continue;
    }
    const archivo = path.join(SALIDA, `${ruta.replace(/^\//, '')}.body`);
    if (!fs.existsSync(archivo)) sinImagen.push(`${f}: declara ${ruta} pero no existe`);
    else if (fs.statSync(archivo).size < 4000) sinImagen.push(`${f}: la imagen ${ruta} salió vacía o rota`);
  }
  if (sinImagen.length) {
    fallas.push(`${sinImagen.length} de ${paginas.length} notas con la imagen para compartir rota; por ejemplo ${sinImagen.slice(0, 3).join(' | ')}`);
  }
}

// El título de CADA nota (D5, 16/10/2026): el titular entero, nunca cortado con "…" por nosotros, y el autor del marcado sólo con el
// nombre. Se compara el <title> con og:title (que es el titular tal cual): tienen que ser iguales, o el <title> con la marca detrás.
{
  const carpeta = path.join(SALIDA, 'nota');
  const paginas = fs.existsSync(carpeta) ? fs.readdirSync(carpeta).filter((f) => f.endsWith('.html')) : [];
  const malos = [];
  for (const f of paginas) {
    const html = fs.readFileSync(path.join(carpeta, f), 'utf8');
    const titulo = html.match(/<title>([^<]*)<\/title>/)?.[1];
    const og = html.match(/property="og:title" content="([^"]*)"/)?.[1];
    if (!titulo || !og) { malos.push(`${f}: sin <title> o sin og:title`); continue; }
    if (titulo !== og && titulo !== `${og} · Radar Balcarce`) malos.push(`${f}: el <title> no es el titular entero (<title> "${titulo}", og:title "${og}")`);
    if (titulo.endsWith('…') && !og.endsWith('…')) malos.push(`${f}: el <title> termina cortado con "…"`);
    const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => { try { return JSON.parse(m[1]); } catch { return null; } });
    const articulo = ld.find((x) => x?.['@type'] === 'NewsArticle');
    const autor = articulo?.author?.name;
    // Sólo el nombre del sitio: los nombres de medios de terceros pueden llevar paréntesis ("Puntonueve (FM 100.9)").
    if (autor && /^Radar Balcarce\s*\(/.test(autor)) malos.push(`${f}: el autor del marcado lleva aclaraciones: "${autor}"`);
  }
  if (malos.length) fallas.push(`${malos.length} de ${paginas.length} notas con el título o el autor del marcado mal; por ejemplo ${malos.slice(0, 3).join(' | ')}`);
}

// --- El sitemap y el robots -------------------------------------------
// Con SITEMAP_PARTIDO (regla 321, prendido el 25/10/2026) las notas no van en sitemap.xml sino en los mapas por mes (/sitemap-notas/AAAA-MM/):
// se cuentan todos juntos. Los mapas por mes se arman siempre, así que con el interruptor apagado una nota cuenta dos veces, y alcanza igual.
const mapasPorMes = (() => {
  try {
    return fs.readdirSync(path.join(SALIDA, 'sitemap-notas')).filter((m) => /^\d{4}-\d{2}$/.test(m))
      .map((m) => leer(path.join('sitemap-notas', m, 'sitemap.xml.body')) ?? '').join('\n');
  } catch { return ''; }
})();
const delSitio = leer('sitemap.xml.body');
const sitemap = delSitio === null ? null : `${delSitio}\n${mapasPorMes}`;
if (!sitemap) fallas.push('el sitemap: no se generó');
else {
  const cuantas = (sitemap.match(/<url>/g) ?? []).length;
  // Las que llevan noindex no van al sitemap (16/10/2026), así que se cuentan sólo las que Google puede ver.
  const visibles = datos.notas.filter((n) => !noSeOfreceAGoogle(n)).length;
  if (cuantas < visibles) {
    fallas.push(`el sitemap: ${cuantas} direcciones para ${visibles} notas`);
  }
  // Ninguna dirección con noindex adentro del sitemap.
  for (const n of datos.notas.filter((x) => noSeOfreceAGoogle(x))) {
    if (sitemap.includes(`${n.ruta}</loc>`)) fallas.push(`el sitemap: ofrece ${n.ruta}, que lleva noindex`);
  }
}

const robots = leer('robots.txt.body');
if (!robots) fallas.push('el robots: no se generó');
else if (!robots.includes('/sitemap.xml')) fallas.push('el robots: no apunta al sitemap');
else if (!robots.split('\n').some((l) => l.trim() === 'Disallow: /panel/' || l.trim() === 'Disallow: /')) fallas.push('el robots: no protege /panel/');

// --- Los mapas nuevos y /hoy (17/10/2026, reglas 250 y 255) ------------
{
  const noticias = leer('sitemap-news.xml.body');
  if (noticias === null) fallas.push('el mapa de noticias: no se generó');
  else {
    if (!noticias.includes('xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"')) fallas.push('el mapa de noticias: perdió su espacio de nombres');
    const urls = (noticias.match(/<url>/g) ?? []).length;
    const titulos = (noticias.match(/<news:title>/g) ?? []).length;
    const fechas = (noticias.match(/<news:publication_date>/g) ?? []).length;
    if (urls > 1000) fallas.push(`el mapa de noticias: ${urls} direcciones (Google admite 1.000)`);
    if (urls !== titulos || urls !== fechas) fallas.push(`el mapa de noticias: ${urls} direcciones, ${titulos} títulos y ${fechas} fechas`);
  }
  const indice = leer('sitemap-index.xml.body');
  if (indice === null) fallas.push('el índice de mapas: no se generó');
  else if (!indice.includes('/sitemap.xml</loc>') || !indice.includes('/sitemap-news.xml</loc>')) fallas.push('el índice de mapas: no lista el sitemap.xml y el de noticias');
  const robotsTexto = leer('robots.txt.body');
  if (robotsTexto && !robotsTexto.includes('/sitemap-index.xml')) fallas.push('el robots: no anuncia el índice de mapas');
  exigir('/hoy', leer('hoy.html'), {
    'el título con el día': 'Lo de hoy en Balcarce ·',
    'el enlace canónico': 'rel="canonical"',
    'el h1': '<h1>Lo de hoy en Balcarce</h1>',
    'el botón de WhatsApp': 'https://wa.me/?text=',
  });
}

// --- Velocidad (17/10/2026, regla 252): imágenes con tamaño, la principal prioritaria y el resto perezosas, nada de terceros ----------
{
  const paginas = [['/', 'index.html'], ['/hoy', 'hoy.html'], ['/quienes-somos', 'quienes-somos.html']];
  for (const carpeta of ['nota', 'seccion']) {
    const dir = path.join(SALIDA, carpeta);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.html'))) paginas.push([`/${carpeta}/${f.replace(/\.html$/, '')}`, path.join(carpeta, f)]);
  }
  const problemas = [];
  for (const [donde, archivo] of paginas) {
    const html = leer(archivo);
    if (html !== null) problemas.push(...problemasDeVelocidad(html, { pagina: donde }));
  }
  if (problemas.length) fallas.push(`${problemas.length} problemas de velocidad en ${paginas.length} páginas; por ejemplo ${problemas.slice(0, 3).join(' | ')}`);
}

// ----------------------------------------------------------------------
if (fallas.length) {
  console.error('\nEl SEO se rompió:\n');
  fallas.forEach((f) => console.error(`  · ${f}`));
  console.error('\nNo se publica. La web se queda como está.\n');
  process.exit(1);
}

console.log(`SEO en pie · ${datos.notas.length} notas, ${(sitemap.match(/<url>/g) ?? []).length} direcciones en el sitemap`);
