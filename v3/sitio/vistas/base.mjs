// La carcasa de todas las páginas: barra superior, cabecera, menú, pie, estilos y metadatos. HTML liviano.
// El único JavaScript del sitio es el del botón del menú en el celular (sin él, el menú se ve abierto).
import { BASE, NOMBRE, SECCIONES, esc } from '../util.mjs';
import { barraSuperior } from './dia.mjs';

const FUENTES = 'https://radarbalcarce.com/fuentes';
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122';

// Tapa A «Diario» (docs/propuestas/tapa-3-0/a-diario.html), con los colores y las letras del sitio de hoy.
export const ESTILOS = `
@font-face{font-family:"Source Serif 4";font-weight:600 900;font-display:swap;src:url("${FUENTES}/source-serif-4-latin.woff2") format("woff2");unicode-range:${LATIN}}
@font-face{font-family:"Inter";font-weight:400 700;font-display:swap;src:url("${FUENTES}/inter-latin.woff2") format("woff2");unicode-range:${LATIN}}
:root{--rojo:#C7381C;--tinta:#14161A;--crema:#F4F1EA;--papel:#FFFDF8;--linea:#E4DFD2;--suave:#5C6068;--texto:#2B2F35;--ambar:#E8A33C;--foco:#0B57D0;
--s-balcarce:#B91C1C;--s-politica:#3730A3;--s-policiales:#831843;--s-deportes:#0F766E;--s-futbol:#7C3AED;--s-automovilismo:#B45309;--s-agro:#5A6B0A;
--s-cultura:#9D2C8F;--s-economia:#8A6500;--s-tecnologia:#0B6FB8;--s-argentina:#4B5563;--s-educacion:#1D4BE0;--s-salud:#004E5C;--s-ciencia:#772E9E;
--serif:"Source Serif 4",Georgia,"Times New Roman",serif;--sans:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--crema);color:var(--texto);font:400 16px/1.5 var(--sans);overflow-wrap:break-word}
a{color:inherit;text-decoration:none}
img{display:block;max-width:100%}
a:focus-visible,button:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid var(--foco);outline-offset:2px}
.top a:focus-visible,.pie a:focus-visible,.part a:focus-visible,.top button:focus-visible{outline-color:#fff}
.ancho{max-width:1200px;margin:0 auto;padding:0 16px}
.top{background:var(--tinta);color:var(--crema);font-size:12px}
.top .ancho{display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 12px;padding-top:7px;padding-bottom:7px}
.top-datos{font-variant-numeric:tabular-nums}
header.cab{background:var(--papel);border-bottom:3px solid var(--tinta)}
.cab .ancho{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 16px;padding-top:12px;padding-bottom:12px}
.logo{font:800 30px/1.1 var(--serif);letter-spacing:-.02em;white-space:nowrap;color:var(--tinta)}
.logo span{color:var(--rojo)}
.logo small{display:block;font:500 11px var(--sans);letter-spacing:.04em;color:var(--suave);margin-top:2px}
form.buscar{display:flex;gap:6px;order:3;flex:1 1 100%}
form.buscar input{flex:1;min-width:0;padding:8px 10px;border:1px solid #b9b2a0;border-radius:8px;font:inherit;font-size:16px;background:#fff;color:var(--tinta)}
form.buscar button{padding:8px 14px;border:0;border-radius:8px;background:var(--tinta);color:#fff;font:600 14px var(--sans);cursor:pointer}
#mb{display:none;font:600 14px var(--sans);border:1.5px solid var(--tinta);background:none;border-radius:999px;padding:8px 14px;color:var(--tinta);cursor:pointer}
.js #mb{display:inline-block}
nav#menu{background:var(--papel);border-bottom:1px solid var(--linea)}
.js nav#menu{display:none}
.js nav#menu.abierto{display:block}
nav#menu .ancho{display:grid;grid-template-columns:1fr 1fr;gap:0 16px;padding-top:6px;padding-bottom:12px}
nav#menu a{display:flex;align-items:center;gap:8px;padding:11px 0;border-bottom:1px solid var(--linea);font-weight:600;font-size:15px;color:var(--tinta)}
nav#menu a::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--cc)}
nav#menu a:hover{text-decoration:underline}
main.ancho{padding-top:16px;padding-bottom:16px}
h1{margin:10px 0 8px;color:var(--tinta);font:800 clamp(28px,5vw,40px)/1.15 var(--serif)}
.mt{margin-top:18px}
.chip,.etiqueta{font:700 11px/1.5 var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--cc)}
.etiqueta{display:inline-block;padding:2px 8px;color:#fff;font-size:12px;letter-spacing:.04em;background:var(--s-argentina)}
.hora,.meta{font-size:12px;color:var(--suave);font-variant-numeric:tabular-nums}
.bajada{margin:0 0 12px;font-size:20px;line-height:1.4;color:var(--tinta)}
p.meta{margin:0 0 16px;font-size:14px}
.dos-lineas{margin:0 0 18px;padding:10px 14px;background:#fff;border-left:4px solid var(--rojo)}
.dos-lineas strong{display:block;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--suave)}
figure{margin:0 0 18px}
figure img{display:block;width:100%;height:auto}
figcaption{margin-top:4px;font-size:13px;color:var(--suave)}
article.nota{max-width:720px;margin:0 auto}
article.nota .cuerpo{font-size:17px;line-height:1.6}
.cuerpo p{margin:0 0 1em}
.bloque{margin:22px 0;padding:12px 16px;border:1px solid var(--linea);background:#fff}
.bloque h2{margin:0 0 8px;font:700 18px var(--serif);color:var(--tinta)}
.bloque dl{margin:0;display:grid;grid-template-columns:max-content 1fr;gap:4px 14px}
.bloque dt{font-weight:600;color:var(--tinta)}
.bloque dd{margin:0}
.bloque ul,.bloque ol{margin:0;padding-left:20px}
.cifras{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;list-style:none;padding:0!important}
.cifras li{padding:8px;background:var(--crema)}
.cifras b{display:block;font:800 22px var(--serif);color:var(--tinta);font-variant-numeric:tabular-nums}
.cifras small{color:var(--suave)}
.firma{margin:22px 0 8px;font-size:14px;color:var(--suave)}
details.fuentes{margin:8px 0 20px;border-top:1px solid var(--linea);padding-top:8px;font-size:15px}
details.fuentes summary{cursor:pointer;font-weight:600;color:var(--tinta)}
details.fuentes a{text-decoration:underline}
.cuerpo a{text-decoration:underline}
/* Avisos: vacíos no ocupan lugar; cuando tengan datos, caben 728x90 en computadora y 320x100 en el celular. */
.aviso{margin:18px 0;min-height:0}
.aviso:empty{margin:0}
/* Placa: lo que sale cuando la nota no tiene foto. */
.placa{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;width:100%;aspect-ratio:16/9;background:linear-gradient(135deg,var(--pc),#14161A);color:#fff;font-family:var(--serif);text-align:center;border-radius:10px}
.placa b{font-size:20px;font-weight:800}
.placa i{font-style:normal;opacity:.75;margin-left:3px}
.placa em{font:600 10px var(--sans);letter-spacing:.14em;text-transform:uppercase;opacity:.8}
/* Portada */
.info{display:grid;grid-template-columns:1.25fr 1fr;gap:1px;background:var(--linea);border:1px solid var(--linea);border-radius:12px;overflow:hidden}
.info>div{background:var(--papel);padding:12px 14px;min-width:0}
.info .k{display:block;margin-bottom:4px;font:700 10px var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--rojo)}
.info .big{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 8px}
.info .big strong{font:800 34px/1 var(--serif);font-variant-numeric:tabular-nums}
.info .big span{font-weight:600;font-size:14px}
.info .fa strong{display:block;font:700 20px var(--serif)}
.info .sm{margin:4px 0 0;font-size:12px;line-height:1.4;color:var(--suave);font-variant-numeric:tabular-nums}
.info .sm a{text-decoration:underline}
.hero img,.hero .placa{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:12px}.hero img{background:#ddd}
.hero h1{margin:12px 0 8px;font:800 30px/1.1 var(--serif);letter-spacing:-.015em;color:var(--tinta)}
.hero p{margin:0 0 6px;font-size:16px;color:#343841}
.cred{margin-top:5px;font-size:11px;color:var(--suave)}
.lat3 a{display:block;padding:14px 0;border-top:1px solid var(--linea)}
.lat3 h3{margin:4px 0;font:700 19px/1.2 var(--serif);color:var(--tinta)}
.lat3 p{margin:0;font-size:14px;color:var(--suave)}
.sec-t{display:flex;align-items:center;gap:10px;margin:26px 0 12px;font:800 13px var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--tinta)}
.sec-t::after{content:"";flex:1;height:2px;background:var(--tinta)}
.grid3{display:grid;grid-template-columns:1fr;gap:20px}
.card{display:block}
.card img,.card .placa{width:100%;aspect-ratio:3/2;object-fit:cover;border-radius:10px}.card img{background:#ddd}
.card h3{margin:9px 0 4px;font:700 20px/1.2 var(--serif);color:var(--tinta)}
.card p{margin:0;font-size:14px;color:var(--suave)}
.lista{list-style:none;margin:0;padding:0}
.lista li{border-top:1px solid var(--linea)}
.lista li>a.fila{display:grid;grid-template-columns:104px 1fr;gap:12px;padding:14px 0;align-items:start}
.lista img,.lista .placa{width:104px;height:104px;aspect-ratio:1;object-fit:cover;border-radius:8px}.lista img{background:#ddd}
.lista .placa b{font-size:13px}
.lista .placa em{display:none}
.lista h2,.lista h3{margin:2px 0 4px;font:700 17px/1.22 var(--serif);color:var(--tinta)}
.lista p{display:none;margin:0;font-size:14px;color:var(--suave)}
.lado .aviso{margin-top:0}
.masleidas{background:var(--papel);border:1px solid var(--linea);border-radius:12px;padding:14px;margin-bottom:18px}
.masleidas h2{margin:0 0 6px;font:800 12px var(--sans);letter-spacing:.12em;text-transform:uppercase;color:var(--tinta)}
.masleidas ol{list-style:none;margin:0;padding:0;counter-reset:x}
.masleidas li{counter-increment:x;display:grid;grid-template-columns:28px 1fr;padding:9px 0;border-top:1px solid var(--linea);font:600 15px/1.25 var(--serif)}
.masleidas li::before{content:counter(x);font:800 20px/1 var(--serif);color:var(--rojo);font-variant-numeric:tabular-nums}
.part{display:flex;flex-direction:column;gap:14px;align-items:flex-start;padding:20px 16px;background:var(--tinta);color:var(--crema);border-radius:14px;border-left:6px solid var(--ambar)}
.part h2{margin:0 0 6px;font:800 22px/1.15 var(--serif)}
.part p{margin:0;font-size:14px;opacity:.92}
.part b{color:var(--ambar);font-variant-numeric:tabular-nums}
.btn{display:inline-block;padding:12px 18px;border-radius:999px;background:var(--ambar);color:var(--tinta);font-weight:700;font-size:14px;text-align:center}
.paginas{display:flex;justify-content:space-between;margin-top:20px;font-weight:600}
.paginas a{text-decoration:underline}
footer.pie{margin-top:28px;padding:28px 0 40px;background:var(--tinta);color:#c9c5ba;font-size:13px}
footer.pie .ancho{display:grid;gap:8px}
footer.pie .logo{color:#fff;font-size:22px}
footer.pie p{margin:0}
footer.pie a{text-decoration:underline}
.sinnada{padding:20px 0}
@media(min-width:760px){
 .logo{font-size:38px}
 form.buscar{order:0;flex:0 1 300px}
 #mb,.js #mb{display:none}
 .js nav#menu,.js nav#menu.abierto{display:block}
 nav#menu{border-bottom:1px solid var(--tinta)}
 nav#menu .ancho{display:flex;flex-wrap:wrap;justify-content:space-between;padding-top:0;padding-bottom:0}
 nav#menu a{border:0;padding:12px 0;font-size:13px;gap:5px}
 nav#menu a::before{width:6px;height:6px}
 .portal{display:grid;grid-template-columns:1.75fr 1fr;gap:28px}
 .hero h1{font-size:40px}
 .grid3{grid-template-columns:repeat(3,1fr)}
 .con-lado{display:grid;grid-template-columns:1fr 300px;gap:32px;align-items:start}
 .lista li>a.fila{grid-template-columns:200px 1fr}
 .lista img,.lista .placa{width:200px;height:134px;aspect-ratio:auto}
 .lista p{display:block}
 .lista h2,.lista h3{font-size:21px}
 .part{flex-direction:row;align-items:center;justify-content:space-between}
 aside.lado{position:sticky;top:12px}
}
`;

// Las secciones en el menú; «Tecnología» se lee «Tecnología e IA».
const ROTULO = { Tecnología: 'Tecnología e IA' };
export const rotuloDe = (nombre) => ROTULO[nombre] || nombre;

export const colorDe = (ranura) => `var(--s-${ranura})`;

export function menu() {
  return `<nav id="menu" aria-label="Secciones"><div class="ancho">${SECCIONES.map((s) => `<a href="/seccion/${s.ranura}" style="--cc:${colorDe(s.ranura)}">${esc(rotuloDe(s.nombre))}</a>`).join('')}</div></nav>`;
}

// Si hay JavaScript, el menú arranca cerrado en el celular y el botón lo abre; si no, queda a la vista.
const GUION_DEL_MENU = `<script>document.documentElement.className+=' js';(function(){var b=document.getElementById('mb'),m=document.getElementById('menu');if(!b||!m)return;b.addEventListener('click',function(){var o=m.classList.toggle('abierto');b.setAttribute('aria-expanded',o)})})()</script>`;

/** Un script de datos estructurados: se escapa "<" para que nada cierre la etiqueta. */
export const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

/**
 * La página entera. `p`: { titulo, descripcion?, canonico? (ruta), indexar (bool), noindex?, cuerpo, imagen?, tipo?, datos?: [], q?, sinSufijo?, contexto? }
 * `contexto`: { ahora, clima, farmacia } para la barra superior (ver vistas/dia.mjs).
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
${barraSuperior(p.contexto)}
<header class="cab"><div class="ancho">
<a class="logo" href="/">Radar <span>Balcarce</span><small>Noticias de Balcarce y la zona</small></a>
<button id="mb" type="button" aria-expanded="false" aria-controls="menu">Secciones ☰</button>
<form class="buscar" action="/buscar" method="get" role="search"><input type="search" name="q" value="${esc(p.q || '')}" placeholder="Buscar en Radar" aria-label="Buscar"><button type="submit">Buscar</button></form>
</div></header>
${menu()}
<main class="ancho" id="contenido">
${p.cuerpo}
</main>
<footer class="pie"><div class="ancho"><div class="logo">Radar <span>Balcarce</span></div>
<p>Noticias de Balcarce y la zona, todo el día. Medio digital automático: escritas con ayuda de IA, verificadas contra las fuentes; cada nota dice quién la escribió y de qué fuentes sale.</p>
<p><a href="/rss.xml">RSS</a> · Balcarce, Buenos Aires</p></div></footer>
${GUION_DEL_MENU}
</body>
</html>`;
}
