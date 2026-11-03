// La carcasa de todas las páginas: cabecera, menú, pie, estilos y metadatos. HTML liviano, sin JavaScript.
import { BASE, NOMBRE, SECCIONES, esc } from '../util.mjs';

const FUENTES = 'https://radarbalcarce.com/fuentes';
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122';

// Los colores y las letras del sitio de hoy (web/app/globals.css).
export const ESTILOS = `
@font-face{font-family:"Source Serif 4";font-weight:600 900;font-display:swap;src:url("${FUENTES}/source-serif-4-latin.woff2") format("woff2");unicode-range:${LATIN}}
@font-face{font-family:"Inter";font-weight:400 700;font-display:swap;src:url("${FUENTES}/inter-latin.woff2") format("woff2");unicode-range:${LATIN}}
:root{--tinta:#14161A;--papel:#fff;--crema:#F4F1EA;--linea:#E4DFD2;--suave:#6B6F6C;--texto:#3B403C;--rojo:#C7381C;--verde:#16615B;
--s-balcarce:#B91C1C;--s-politica:#3730A3;--s-policiales:#831843;--s-deportes:#0F766E;--s-futbol:#7C3AED;--s-automovilismo:#B45309;--s-agro:#5A6B0A;
--s-cultura:#9D2C8F;--s-economia:#8A6500;--s-tecnologia:#0B6FB8;--s-argentina:#4B5563;--s-educacion:#1D4BE0;--s-salud:#004E5C;--s-ciencia:#772E9E}
*{box-sizing:border-box}
body{margin:0;background:var(--papel);color:var(--texto);font:400 17px/1.6 Inter,system-ui,-apple-system,"Segoe UI",sans-serif}
a{color:inherit}
.ancho{max-width:1080px;margin:0 auto;padding:0 16px}
header.sitio{border-bottom:3px solid var(--tinta)}
.marca{display:block;padding:14px 0 6px;font:800 28px/1.1 "Source Serif 4",Georgia,serif;color:var(--tinta);text-decoration:none}
.marca span{color:var(--rojo)}
nav.menu{display:flex;flex-wrap:wrap;gap:4px 14px;padding:4px 0 10px;font-size:14px;font-weight:600}
nav.menu a{text-decoration:none;color:var(--tinta)}
nav.menu a:hover{text-decoration:underline}
form.buscar{display:flex;gap:6px;margin:0 0 10px}
form.buscar input{flex:1;max-width:320px;padding:6px 8px;border:1px solid var(--linea);font:inherit;font-size:14px}
form.buscar button{padding:6px 12px;border:0;background:var(--tinta);color:#fff;font:600 14px Inter,sans-serif}
main{padding:20px 0 40px}
article.nota{max-width:720px;margin:0 auto}
.etiqueta{display:inline-block;padding:2px 8px;color:#fff;font:700 12px/1.5 Inter,sans-serif;letter-spacing:.04em;text-transform:uppercase;text-decoration:none;background:var(--s-argentina)}
h1{margin:10px 0 8px;color:var(--tinta);font:800 clamp(28px,5vw,40px)/1.15 "Source Serif 4",Georgia,serif}
.bajada{margin:0 0 12px;font-size:20px;line-height:1.4;color:var(--tinta)}
.meta{margin:0 0 16px;font-size:14px;color:var(--suave)}
.dos-lineas{margin:0 0 18px;padding:10px 14px;background:var(--crema);border-left:4px solid var(--rojo)}
.dos-lineas strong{display:block;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--suave)}
figure{margin:0 0 18px}
figure img{display:block;width:100%;height:auto}
figcaption{margin-top:4px;font-size:13px;color:var(--suave)}
.cuerpo p{margin:0 0 1em}
.bloque{margin:22px 0;padding:12px 16px;border:1px solid var(--linea)}
.bloque h2{margin:0 0 8px;font:700 18px "Source Serif 4",Georgia,serif;color:var(--tinta)}
.bloque dl{margin:0;display:grid;grid-template-columns:max-content 1fr;gap:4px 14px}
.bloque dt{font-weight:600;color:var(--tinta)}
.bloque dd{margin:0}
.bloque ul,.bloque ol{margin:0;padding-left:20px}
.cifras{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;list-style:none;padding:0!important}
.cifras li{padding:8px;background:var(--crema)}
.cifras b{display:block;font:800 22px "Source Serif 4",Georgia,serif;color:var(--tinta)}
.cifras small{color:var(--suave)}
.firma{margin:22px 0 8px;font-size:14px;color:var(--suave)}
details.fuentes{margin:8px 0 20px;border-top:1px solid var(--linea);padding-top:8px;font-size:15px}
details.fuentes summary{cursor:pointer;font-weight:600;color:var(--tinta)}
.aviso{margin:20px 0;min-height:0}
.lista{list-style:none;margin:0;padding:0}
.lista li{display:grid;grid-template-columns:120px 1fr;gap:12px;padding:14px 0;border-bottom:1px solid var(--linea)}
.lista img{width:120px;height:80px;object-fit:cover;background:var(--crema)}
.lista h2{margin:4px 0;font:700 20px/1.25 "Source Serif 4",Georgia,serif}
.lista h2 a{text-decoration:none;color:var(--tinta)}
.lista p{margin:0;font-size:15px}
.paginas{display:flex;justify-content:space-between;margin-top:20px;font-weight:600}
footer.sitio{border-top:1px solid var(--linea);padding:18px 0 30px;font-size:14px;color:var(--suave)}
@media(max-width:560px){.lista li{grid-template-columns:90px 1fr}.lista img{width:90px;height:64px}}
`;

export const colorDe = (ranura) => `var(--s-${ranura})`;

export function menu() {
  return `<nav class="menu" aria-label="Secciones">${SECCIONES.map((s) => `<a href="/seccion/${s.ranura}">${esc(s.nombre)}</a>`).join('')}</nav>`;
}

/** Un script de datos estructurados: se escapa "<" para que nada cierre la etiqueta. */
export const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

/**
 * La página entera. `p`: { titulo, descripcion?, canonico? (ruta), indexar (bool), noindex?, cuerpo, imagen?, tipo?, datos?: [], q?, sinSufijo? }
 */
export function pagina(p) {
  const titulo = p.sinSufijo ? p.titulo : `${p.titulo} | ${NOMBRE}`;
  const robots = p.indexar && !p.noindex ? '' : '<meta name="robots" content="noindex,nofollow">';
  const canonico = p.canonico ? `<link rel="canonical" href="${esc(BASE + p.canonico)}">` : '';
  const og = [
    ['og:site_name', NOMBRE], ['og:locale', 'es_AR'], ['og:type', p.tipo || 'website'], ['og:title', p.titulo],
    p.descripcion ? ['og:description', p.descripcion] : null, p.canonico ? ['og:url', BASE + p.canonico] : null, p.imagen ? ['og:image', p.imagen] : null,
  ].filter(Boolean).map(([k, v]) => `<meta property="${k}" content="${esc(v)}">`).join('\n');
  return `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title>
${p.descripcion ? `<meta name="description" content="${esc(p.descripcion)}">` : ''}
${robots}
${canonico}
<link rel="alternate" type="application/rss+xml" title="${NOMBRE}" href="/rss.xml">
${og}
<meta name="twitter:card" content="${p.imagen ? 'summary_large_image' : 'summary'}">
<style>${ESTILOS}</style>
${(p.datos || []).map(jsonLd).join('\n')}
</head>
<body>
<header class="sitio"><div class="ancho">
<a class="marca" href="/">Radar <span>Balcarce</span></a>
${menu()}
<form class="buscar" action="/buscar" method="get" role="search"><input type="search" name="q" value="${esc(p.q || '')}" placeholder="Buscar en Radar" aria-label="Buscar"><button type="submit">Buscar</button></form>
</div></header>
<main><div class="ancho">
${p.cuerpo}
</div></main>
<footer class="sitio"><div class="ancho">${NOMBRE} · Balcarce, Buenos Aires · Medio digital automático: cada nota dice quién la escribió y de qué fuentes sale. <a href="/rss.xml">RSS</a></div></footer>
</body>
</html>`;
}
