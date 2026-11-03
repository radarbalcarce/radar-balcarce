// La carcasa de todas las páginas: barra superior, cabecera, menú, pie, estilos y metadatos. HTML liviano.
// El único JavaScript del sitio es el del botón del menú en el celular (sin él, el menú se ve abierto).
import { BASE, NOMBRE, SECCIONES, esc } from '../util.mjs';
import { barraSuperior } from './dia.mjs';
import { guionDeConsentimiento, avisoDeCookies, cambiarCookies } from './consentimiento.mjs';
import { lugarRotativo } from './avisos.mjs';

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
.logo{transition:color .15s ease}
.logo:hover,.logo:active,.logo:focus-visible{color:var(--rojo)}
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
.placa{--pt:clamp(15px,2.4vw,24px);position:relative;box-sizing:border-box;display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between;gap:8px;width:100%;aspect-ratio:16/9;padding:14px 16px 12px 20px;overflow:hidden;background:#FAF8F3;color:#14161A;border:1px solid #E4DFD2;border-left:8px solid var(--pc);font-family:var(--serif);border-radius:10px}
.placa em{flex:0 0 auto;max-width:100%;padding:3px 9px;border-radius:4px;background:var(--pc);color:#fff;font:700 11px/1.3 var(--sans);font-style:normal;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.placa strong{flex:1 1 auto;min-height:0;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:4;line-clamp:4;overflow:hidden;font:800 var(--pt)/1.18 var(--serif);letter-spacing:-.01em;text-align:left;overflow-wrap:anywhere}
.placa b{flex:0 0 auto;font:800 13px/1 var(--serif);color:#14161A}
.placa i{font-style:normal;color:#C7381C;margin-left:3px}
/* Portada */
.sol{--a:#2B7FD0;--sol-fondo:#fff;--sol-borde:var(--linea);--sol-suave:var(--suave);--sol-sube:#B42318;--sol-baja:#15803D;--sol-igual:#5C6068;
position:relative;max-width:640px;margin:14px 0 4px;border:1px solid var(--sol-borde);border-radius:12px;background:var(--sol-fondo);overflow:hidden;color:var(--tinta)}
.cabeza{display:grid;grid-template-columns:minmax(0,1fr);grid-template-areas:"tira" "ad" "hero" "lat";margin-top:14px}
.cabeza>.sol{grid-area:tira;max-width:none;margin:0 0 14px}
.cab-ad{grid-area:ad;min-width:0}
.cab-hero{grid-area:hero;min-width:0}
.cabeza>.lat3{grid-area:lat;min-width:0}
.sol-r{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.sol-tabs{display:grid;grid-template-columns:repeat(3,1fr);background:var(--crema);border-bottom:1px solid var(--sol-borde)}
.sol-t{--a:#2B7FD0;display:flex;align-items:center;justify-content:center;gap:7px;min-height:44px;padding:0 6px;border-bottom:3px solid transparent;font:700 14px var(--sans);color:var(--sol-suave);cursor:pointer;user-select:none;transition:background .15s ease,color .15s ease}
.sol-t-farmacia{--a:#15803D}.sol-t-dolar{--a:#B7791F}
.sol-t .sol-ic{flex:0 0 22px;width:22px;height:22px;display:block;overflow:visible;color:var(--a)}
.sol-t:hover{background:var(--sol-fondo)}
#sol-clima:checked~.sol-tabs .sol-t-clima,#sol-farmacia:checked~.sol-tabs .sol-t-farmacia,#sol-dolar:checked~.sol-tabs .sol-t-dolar{background:var(--sol-fondo);color:var(--tinta);border-bottom-color:var(--a)}
#sol-clima:focus-visible~.sol-tabs .sol-t-clima,#sol-farmacia:focus-visible~.sol-tabs .sol-t-farmacia,#sol-dolar:focus-visible~.sol-tabs .sol-t-dolar{outline:3px solid var(--foco);outline-offset:-3px}
.sol-p{display:none;padding:10px 14px 12px;min-width:0}
#sol-clima:checked~.sol-paneles .sol-p-clima,#sol-farmacia:checked~.sol-paneles .sol-p-farmacia,#sol-dolar:checked~.sol-paneles .sol-p-dolar{display:block}
.sol-p-clima{--a:#2B7FD0}.sol-p-farmacia{--a:#15803D}.sol-p-dolar{--a:#B7791F}
.sol-cab{display:flex;align-items:center;gap:10px;min-width:0}
.sol-cab .k{font:700 11px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--a)}
.sol-cab svg.ic{flex:0 0 auto}
.sol-mas{margin-left:auto;white-space:nowrap;font:700 13px var(--sans);color:var(--a);text-decoration:underline;text-underline-offset:3px}
.sol-mas:hover{text-decoration-thickness:2px}
.sol .big{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 8px;min-width:0}
.sol .big strong{font:800 30px/1.1 var(--serif);font-variant-numeric:tabular-nums}
.sol .big span{font-weight:600;font-size:14px}
.sol .sm{margin:4px 0 0;font-size:12.5px;line-height:1.4;color:var(--sol-suave);font-variant-numeric:tabular-nums}
.far{margin:4px 0 0;line-height:1.35}
.far strong{display:block;font:700 17px var(--serif)}
.far span{display:inline-block;margin-right:10px;font-size:12.5px;color:var(--sol-suave)}
.dcasas{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px}
.dcasa{min-width:0;padding-left:10px;border-left:3px solid var(--a)}
.dcasa .dn{display:block;font:600 12px var(--sans);color:var(--sol-suave)}
.dcasa strong{font:800 24px/1.15 var(--serif);font-variant-numeric:tabular-nums}
.dcasa small{display:block;font-size:12px;color:var(--sol-suave);font-variant-numeric:tabular-nums}
.dcasa>div{display:flex;align-items:center;gap:6px}
.dv{display:inline-flex;align-items:center}
.dv.sube{color:var(--sol-sube)}.dv.baja{color:var(--sol-baja)}.dv.igual{color:var(--sol-igual)}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.ic{display:block;overflow:visible}
/* Animaciones suaves, sólo transform y opacidad. */
.ic-rayos{transform-origin:24px 24px;animation:ic-gira 24s linear infinite}
.ic-nube{animation:ic-flota 6s ease-in-out infinite alternate}
.ic-luna{transform-origin:24px 24px;animation:ic-flota 7s ease-in-out infinite alternate}
.ic-gota{animation:ic-cae 1.1s linear infinite}.ic-gota.g2{animation-delay:.35s}.ic-gota.g3{animation-delay:.7s}
.ic-rayo{animation:ic-brilla 2.4s ease-in-out infinite}
.tab-nube{animation:ic-flota 4s ease-in-out infinite alternate}
.tab-billete{transform-origin:12px 12px;animation:ic-moneda 6s ease-in-out infinite}
.tab-cruz{transform-origin:12px 12px;animation:ic-late 1.8s ease-in-out infinite}
.ic-flecha.sube{animation:ic-sube 1.4s ease-in-out infinite}
.ic-flecha.baja{animation:ic-baja 1.4s ease-in-out infinite}
@keyframes ic-gira{to{transform:rotate(360deg)}}
@keyframes ic-flota{from{transform:translateX(-1.5px)}to{transform:translateX(1.5px)}}
@keyframes ic-cae{0%{transform:translateY(-3px);opacity:0}30%{opacity:1}100%{transform:translateY(5px);opacity:0}}
@keyframes ic-brilla{0%,60%,100%{opacity:1}70%{opacity:.25}80%{opacity:1}}
@keyframes ic-late{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
@keyframes ic-moneda{0%,70%,100%{transform:scaleX(1)}85%{transform:scaleX(.08)}}
@keyframes ic-sube{0%,100%{transform:translateY(1px)}50%{transform:translateY(-3px)}}
@keyframes ic-baja{0%,100%{transform:translateY(-1px)}50%{transform:translateY(3px)}}
@media(prefers-reduced-motion:reduce){.ic-rayos,.ic-nube,.ic-luna,.ic-gota,.ic-rayo,.tab-nube,.tab-cruz,.tab-billete,.ic-flecha,.logo,.sol-t{animation:none!important;transition:none!important}}
@media(max-width:420px){.sol-t{font-size:13px;gap:5px}.sol-p{padding:8px 12px 10px}.sol .big strong{font-size:28px}}
@media(prefers-color-scheme:dark){.sol{--sol-fondo:#1D2127;--sol-borde:#343A43;--sol-suave:#B9BEC7;--sol-sube:#FF8A7A;--sol-baja:#6EE7A0;--sol-igual:#B9BEC7;color:#F1EEE6}
.sol-tabs{background:#14161A}.sol-t{color:#B9BEC7;--a:#6AB0F5}.sol-t-farmacia{--a:#5FD08A}.sol-t-dolar{--a:#F0B75A}
.sol-p-clima{--a:#6AB0F5}.sol-p-farmacia{--a:#5FD08A}.sol-p-dolar{--a:#F0B75A}
#sol-clima:checked~.sol-tabs .sol-t-clima,#sol-farmacia:checked~.sol-tabs .sol-t-farmacia,#sol-dolar:checked~.sol-tabs .sol-t-dolar{color:#F1EEE6}
.sol-t:hover{background:#1D2127}}
.pdia{max-width:720px}
.pdia h1{margin:18px 0 6px;font:800 30px/1.1 var(--serif);color:var(--tinta)}
.pdia .bajada{margin:0 0 16px;color:var(--suave)}
.pdia h2{margin:22px 0 8px;font:800 20px var(--serif);color:var(--tinta)}
.pdia .ahora{display:flex;align-items:center;gap:14px;padding:14px;border:1px solid var(--pd-b);border-radius:12px;background:var(--pd-f);color:var(--pd-t)}
.pdia .ahora strong{font:800 44px/1 var(--serif);font-variant-numeric:tabular-nums}
.pdia .ahora p{margin:0}
.pdia .tabla{width:100%;border-collapse:collapse;background:var(--pd-f);color:var(--pd-t);border:1px solid var(--pd-b);font-variant-numeric:tabular-nums}
.pdia .tabla th,.pdia .tabla td{padding:9px 12px;text-align:left;border-bottom:1px solid var(--pd-b)}
.pdia .tabla th{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--pd-s)}
.pdia .tabla tr:last-child td{border-bottom:0}
.pdia .tabla td.num,.pdia .tabla th.num{text-align:right;white-space:nowrap}
.pdia .ficha{padding:12px 14px;margin:0 0 12px;border:1px solid var(--pd-b);border-radius:12px;background:var(--pd-f);color:var(--pd-t)}
.pdia .ficha h3{margin:0 0 4px;font:700 20px var(--serif);color:var(--pd-t)}
.pdia .ficha p{margin:2px 0}
.pdia a.enlace{color:var(--rojo);text-decoration:underline}
.pdia .nota-chica{font-size:14px;color:var(--suave)}
.pdia{max-width:760px}
.pdia .evs{list-style:none;margin:0 0 6px;padding:0}
.pdia .evs li{border-bottom:1px solid var(--linea)}
.pdia .evs a{display:block;padding:10px 0}
.pdia .evs strong{display:block;font:700 18px/1.25 var(--serif);color:var(--tinta)}
.pdia .evs span{font-size:14px;color:var(--suave)}
.pdia .evs a:hover strong{text-decoration:underline}
.pdia .botones{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}
.pdia .boton{display:inline-block;padding:9px 14px;border:1.5px solid var(--tinta);border-radius:999px;font:600 14px var(--sans);color:var(--tinta)}
.pdia .boton.rojo{background:var(--rojo);border-color:var(--rojo);color:#fff}
.pdia .aviso{margin:0 0 14px;padding:10px 14px;border-left:4px solid var(--ambar);background:var(--papel);color:var(--tinta)}
.pdia dl.datos{display:grid;grid-template-columns:max-content 1fr;gap:6px 14px;margin:14px 0}
.pdia dl.datos dt{font-weight:600;color:var(--tinta)}
.pdia dl.datos dd{margin:0}
.pdia pre.copiable{white-space:pre-wrap;margin:0 0 8px;padding:12px 14px;border:1px solid var(--linea);background:var(--papel);font:400 15px/1.5 var(--sans);color:var(--texto)}
.pdia .tel{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px}
.pdia .tel a,.pdia .tel div{display:block;padding:10px 12px;border:1px solid var(--linea);background:var(--papel);color:var(--tinta)}
.pdia .tel b{display:block;font-size:14px}
.pdia .tel span{font:700 17px var(--serif);font-variant-numeric:tabular-nums}
.pdia .escudo{width:22px;height:22px;vertical-align:middle;margin-right:6px}
.pdia{--g-temp:#C2410C;--g-lluvia:#2B7FD0;--g-eje:#5C6068;--g-grilla:#E4DFD2;--g-fondo:#FFFFFF}
.pdia .grafico{margin:0;padding:10px 8px 6px;border:1px solid var(--linea);border-radius:12px;background:var(--g-fondo)}
.pdia .grafico-horas{display:block;width:100%;height:auto;max-width:640px;margin:0 auto}
.g-grilla{stroke:var(--g-grilla);stroke-width:1}
.g-dia{stroke:var(--g-eje);stroke-width:1;stroke-dasharray:3 3;opacity:.6}
.g-barra{fill:var(--g-lluvia);opacity:.45}
.g-linea{fill:none;stroke:var(--g-temp);stroke-width:2.6;stroke-linejoin:round;stroke-linecap:round}
.g-punto{fill:var(--g-fondo);stroke:var(--g-temp);stroke-width:2}
.g-ahora{fill:var(--g-temp);stroke:var(--g-fondo);stroke-width:2}
.g-txt{font:600 13px var(--sans);fill:var(--g-eje)}
.g-txt.g-t,.g-txt.g-r{fill:var(--g-temp)}.g-txt.g-l{fill:var(--g-lluvia)}.g-txt.g-d{font-weight:800}
.g-halo{font-weight:800;font-size:14px;paint-order:stroke;stroke:var(--g-fondo);stroke-width:3px}
.pdia .leyenda{display:flex;flex-wrap:wrap;gap:4px 16px;margin:8px 0 0;padding:0;list-style:none;font-size:13px;color:var(--g-eje)}
@media(max-width:520px){.pdia .tabla th,.pdia .tabla td{padding:8px 6px}.pdia .tabla.dias th:nth-child(2),.pdia .tabla.dias td:nth-child(2){display:none}}
.pdia .leyenda i{display:inline-block;width:14px;height:4px;margin-right:6px;vertical-align:middle;border-radius:2px;background:var(--g-temp)}
.pdia .leyenda i.ll{height:10px;background:var(--g-lluvia);opacity:.55}
.pdia .smn{margin:0 0 14px;padding:12px 14px;border:1px solid var(--pd-b);border-left:4px solid var(--ambar);border-radius:12px;background:var(--pd-f);color:var(--pd-t)}
.pdia .smn h3{margin:0 0 4px;font:800 17px var(--serif);color:var(--pd-t)}
.pdia .smn p{margin:2px 0;font-size:15px}
.pdia .region td small{display:block;color:var(--pd-s);font-size:12.5px}
.pdia .region tr.aca td{font-weight:700;background:var(--pd-a)}
@media(prefers-color-scheme:dark){.pdia{--g-temp:#FF9A6B;--g-lluvia:#6AB0F5;--g-eje:#B9BEC7;--g-grilla:#343A43;--g-fondo:#1D2127}}
.pdia{--pd-f:#fff;--pd-t:var(--tinta);--pd-b:var(--linea);--pd-s:var(--suave);--pd-a:var(--crema);--pd-tile:rgba(255,255,255,.72);--pd-sube:#B42318;--pd-baja:#15803D;--pd-acc:#2B7FD0;--h1:#D8EAF8;--h2:#F6FAFD}
.pdia .t-sol{--h1:#FFE7B0;--h2:#FFF8E6}
.pdia .t-nube{--h1:#D9E1E8;--h2:#F1F4F7}
.pdia .t-lluvia{--h1:#C5D7E8;--h2:#E8EFF6}
.pdia .t-noche{--h1:#CBD3EA;--h2:#E9ECF6}
.pdia .k{display:block;font:700 11px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--pd-s)}
.pdia .hero-clima{margin:0 0 8px;padding:18px;border:1px solid var(--pd-b);border-radius:16px;background:linear-gradient(160deg,var(--h1),var(--h2));color:var(--pd-t)}
.pdia .hc-ahora{display:flex;align-items:center;gap:18px;flex-wrap:wrap}
.pdia .hc-icono{flex:0 0 auto;width:120px;height:120px;animation:hc-flota 7s ease-in-out infinite alternate}
.pdia .hc-icono .ic{width:120px;height:120px}
.pdia .hc-icono .ic,.pdia .dia-clima .ic{filter:drop-shadow(0 2px 3px rgba(20,22,26,.28))}
.pdia .hc-texto{display:flex;flex-direction:column;gap:2px;min-width:0}
.pdia .hc-temp{font:800 64px/1 var(--serif);font-variant-numeric:tabular-nums;color:var(--pd-t)}
.pdia .hc-cielo{font:700 20px var(--serif);color:var(--pd-t)}
.pdia .hc-hoy{font-size:14px;color:var(--pd-s)}
.pdia .datos{list-style:none;margin:16px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.pdia .dato{display:flex;flex-direction:column;gap:3px;padding:11px 12px;border:1px solid var(--pd-b);border-radius:12px;background:var(--pd-tile);color:var(--pd-t)}
.pdia .dato-t{font:700 11px var(--sans);letter-spacing:.07em;text-transform:uppercase;color:var(--pd-s)}
.pdia .dato strong{display:flex;align-items:center;gap:6px;font:800 24px/1.1 var(--serif);font-variant-numeric:tabular-nums}
.pdia .dato small{font-size:12.5px;line-height:1.35;color:var(--pd-s)}
.pdia .dato .rumbo{font:700 13px var(--sans);color:var(--pd-s)}
.pdia .flecha-viento{flex:0 0 22px;color:var(--pd-acc);transition:transform .4s ease}
.pdia .arco{display:block;height:7px;border-radius:4px;background:var(--pd-b);overflow:hidden}
.pdia .arco i{display:block;height:100%;border-radius:4px;background:var(--pd-acc)}
.pdia .dato-sol .arco i{background:#E8A33C}
.pdia .uvbar i{background:linear-gradient(90deg,#4CAF50,#F5C518,#F28C28,#D64545)}
.pdia .semana{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(138px,1fr));gap:10px}
.pdia .dia-clima{display:flex;flex-direction:column;align-items:center;gap:3px;padding:12px 8px;border:1px solid var(--pd-b);border-radius:14px;background:var(--pd-f);color:var(--pd-t);text-align:center}
.pdia .dc-n{font:800 17px var(--serif)}
.pdia .dc-f{font-size:12px;color:var(--pd-s)}
.pdia .dc-c{min-height:2.6em;font-size:13px;line-height:1.3;color:var(--pd-s)}
.pdia .dc-t{display:flex;align-items:center;gap:6px;width:100%;font-variant-numeric:tabular-nums}
.pdia .dc-t b{flex:0 0 auto;min-width:2.1em;font-size:15px}
.pdia .rango{position:relative;flex:1;height:8px;border-radius:4px;background:var(--pd-b)}
.pdia .rango i{position:absolute;top:0;bottom:0;border-radius:4px;background:linear-gradient(90deg,#4FA3F7,#F5A623,#E4572E)}
.pdia .dc-ll{display:flex;align-items:center;justify-content:center;gap:4px;font-weight:700;font-size:14px;color:var(--pd-s)}
.pdia .dc-ll.alta{color:var(--pd-acc)}
.pdia .dc-ll small{font-weight:500;font-size:12px}
@keyframes hc-flota{from{transform:translateY(-3px)}to{transform:translateY(4px)}}
.pdia .far-hoy{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin:0 0 10px;padding:18px;border:1px solid var(--pd-b);border-left:6px solid #15803D;border-radius:16px;background:var(--pd-f);color:var(--pd-t)}
.pdia .far-datos{flex:1 1 220px;min-width:0}
.pdia .far-datos h2{margin:2px 0 4px;font:800 28px/1.1 var(--serif);color:var(--pd-t)}
.pdia .far-dir{margin:0;font-size:17px}
.pdia .far-tel{margin:2px 0 0;font-size:15px;color:var(--pd-s)}
.pdia .farm-cruz{flex:0 0 56px;color:#15803D}
.pdia .farm-aro{fill:none;stroke:currentColor;stroke-width:2;opacity:.35}
.pdia .farm-cruz-p{fill:currentColor;transform-origin:24px 24px;animation:ic-late 1.8s ease-in-out infinite}
.pdia .far-botones{display:flex;flex-wrap:wrap;gap:8px;flex:1 1 100%}
.pdia .boton{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:10px 16px;border-radius:999px;font:700 15px var(--sans);text-decoration:none}
.pdia .boton-llamar{background:#15803D;color:#fff}
.pdia .boton-mapa{border:2px solid var(--pd-t);color:var(--pd-t);background:var(--pd-f)}
.pdia .turno-hasta{margin:6px 0 0;padding:10px 14px;border-radius:10px;background:var(--pd-a);color:var(--pd-t);font-size:15px}
.pdia .far-semana{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}
.pdia .far-dia{display:flex;gap:12px;padding:12px;border:1px solid var(--pd-b);border-radius:14px;background:var(--pd-f);color:var(--pd-t)}
.pdia .far-fecha{flex:0 0 54px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px 4px;border-radius:10px;background:#15803D;color:#fff;line-height:1.1}
.pdia .far-fecha b{font:800 24px var(--serif)}
.pdia .far-fecha small{font-size:11px;text-transform:uppercase;letter-spacing:.06em}
.pdia .far-lista{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.pdia .far-sem{font:700 13px var(--sans);color:var(--pd-s)}
.pdia .far-chica{display:flex;flex-direction:column;gap:1px;font-size:14px}
.pdia .far-chica strong{font:700 17px var(--serif)}
.pdia .far-links{display:flex;gap:14px}
.pdia .far-links a{color:var(--pd-acc);text-decoration:underline;font-weight:600}
.pdia .dolar-par{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin:0 0 12px}
.pdia .dolar-grande{display:flex;flex-direction:column;gap:6px;padding:16px;border:1px solid var(--pd-b);border-top:5px solid #B7791F;border-radius:16px;background:var(--pd-f);color:var(--pd-t)}
.pdia .dolar-blue{border-top-color:var(--pd-acc)}
.pdia .dolar-moneda{color:#B7791F;animation:ic-moneda 4s ease-in-out infinite}
.pdia .dolar-blue .dolar-moneda{color:var(--pd-acc)}
.pdia .dg-precios{display:flex;gap:22px}
.pdia .dg-precios small,.pdia .dolar-chica small{display:block;font:700 10.5px var(--sans);letter-spacing:.08em;text-transform:uppercase;color:var(--pd-s)}
.pdia .dg-precios strong{font:800 38px/1.05 var(--serif);font-variant-numeric:tabular-nums}
.pdia .dg-precios div:first-child strong{font-size:28px;color:var(--pd-s)}
.pdia .dv{display:inline-flex;align-items:center;gap:6px;font:700 14px var(--sans);color:var(--pd-s)}
.pdia .dv.sube{color:var(--pd-sube)}.pdia .dv.baja{color:var(--pd-baja)}
.pdia .dg-hora{font-size:12.5px;color:var(--pd-s)}
.pdia .brecha{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:12px 16px;border:1px solid var(--pd-b);border-radius:14px;background:var(--pd-f);color:var(--pd-t)}
.pdia .brecha strong{font:800 32px var(--serif);font-variant-numeric:tabular-nums}
.pdia .brecha p{flex:1 1 220px;margin:0;font-size:14.5px}
.pdia .dolar-otras{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.pdia .dolar-chica{padding:12px 14px;border:1px solid var(--pd-b);border-radius:14px;background:var(--pd-f);color:var(--pd-t)}
.pdia .dolar-chica h3{margin:0 0 6px;font:800 18px var(--serif)}
.pdia .dc-p{display:flex;gap:20px;font:600 18px var(--serif);font-variant-numeric:tabular-nums}
.pdia .dc-p strong{font-size:22px}
.pdia .dolar-chica p{margin:8px 0 0;font-size:13px;line-height:1.4;color:var(--pd-s)}
.pdia .leyenda i.blue{background:var(--g-lluvia);height:4px;opacity:1}
.pdia .g-blue{stroke:var(--g-lluvia)}
.pdia .g-ahora-blue{fill:var(--g-lluvia)}
.pdia .variaciones .var small{display:block;font-size:12px;font-weight:500;color:var(--pd-s)}
.pdia .variaciones .sube{color:var(--pd-sube)}.pdia .variaciones .baja{color:var(--pd-baja)}
.pdia .que-es{margin:0}
.pdia .que-es div{padding:10px 0;border-top:1px solid var(--linea)}
.pdia .que-es dt{font:800 16px var(--serif);color:var(--tinta)}
.pdia .que-es dd{margin:2px 0 0;font-size:14.5px;color:var(--suave)}
.pdia .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.aviso-clima .aviso-caja{flex-direction:row;justify-content:flex-start;gap:14px;min-height:0;text-align:left}
.aviso-clima.con-logo img{flex:0 0 auto;width:auto;max-width:120px;height:56px;aspect-ratio:auto;object-fit:contain;border-radius:8px;margin:0}
.aviso-clima .clima-txt{display:flex;flex-direction:column;gap:1px;min-width:0}
.aviso-clima .clima-con{font:700 12px var(--sans);letter-spacing:.06em;text-transform:uppercase;color:var(--suave)}
.aviso-clima .clima-ir{font:700 13px var(--sans);color:var(--rojo)}
@media(max-width:520px){.pdia .hc-temp{font-size:54px}.pdia .hc-icono,.pdia .hc-icono .ic{width:96px;height:96px}.pdia .semana{grid-template-columns:repeat(2,1fr)}.pdia .dg-precios strong{font-size:32px}.pdia .far-hoy{padding:14px}.pdia .far-datos h2{font-size:24px}.pdia .boton{flex:1 1 100%;justify-content:center}}
@media(prefers-reduced-motion:reduce){.pdia .hc-icono,.pdia .farm-cruz-p,.pdia .dolar-moneda{animation:none!important}.pdia .flecha-viento{transition:none}}
@media(prefers-color-scheme:dark){.pdia{--pd-f:#1D2127;--pd-t:#F1EEE6;--pd-b:#343A43;--pd-s:#B9BEC7;--pd-a:#262B33;--pd-tile:rgba(255,255,255,.07);--pd-sube:#FF8A7A;--pd-baja:#6EE7A0;--pd-acc:#6AB0F5}
.pdia .t-sol{--h1:#3A3118;--h2:#23262B}.pdia .t-nube{--h1:#2B3239;--h2:#1F2429}.pdia .t-lluvia{--h1:#223244;--h2:#1B232C}.pdia .t-noche{--h1:#1A2238;--h2:#161B27}}
.hero .placa{--pt:clamp(20px,3.4vw,30px);padding:20px 22px 16px 26px;border-left-width:12px}
.hero img,.hero .placa{width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;border-radius:12px}.hero img{background:#ddd}
img.fotopropia{object-fit:contain!important;background:#14161A!important}
.hero img.fotopropia,.card img.fotopropia{height:auto;aspect-ratio:auto}
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
.card .placa{--pt:clamp(15px,2vw,19px)}
.card .placa strong{-webkit-line-clamp:5;line-clamp:5}
.card img,.card .placa{width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;border-radius:10px}.card img{background:#ddd}
.card h3{margin:9px 0 4px;font:700 20px/1.2 var(--serif);color:var(--tinta)}
.card p{margin:0;font-size:14px;color:var(--suave)}
.lista{list-style:none;margin:0;padding:0}
.lista li{border-top:1px solid var(--linea)}
.lista li>a.fila{display:grid;grid-template-columns:104px 1fr;gap:12px;padding:14px 0;align-items:start}
.lista img,.lista .placa{width:104px;height:104px;aspect-ratio:1;object-fit:cover;border-radius:8px}.lista img{background:#ddd}
.lista .placa{--pt:12px;padding:8px 8px 7px 11px;gap:4px;border-left-width:5px}
.lista .placa strong{-webkit-line-clamp:5;line-clamp:5;line-height:1.15}
.lista .placa em,.lista .placa b{display:none}
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
/* Avisos: el alto se reserva siempre para que nada se mueva al cargar. Horizontales 4:1 (recomendado 1200x300), columna 6:5 (600x500). */
.aviso{margin:18px 0}
.aviso .rotulo,.anuncio .rotulo{display:block;margin-bottom:3px;font:600 10px var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--suave)}
.aviso-caja{display:flex;flex-direction:column;justify-content:center;align-items:center;gap:2px;min-height:90px;padding:10px 14px;background:var(--papel);border:1px solid var(--linea);border-radius:10px;text-align:center;overflow:hidden}
.aviso.con-imagen .aviso-caja{padding:0;border:0;background:none;min-height:0}
.aviso.con-imagen img{width:100%;max-width:728px;aspect-ratio:4/1;object-fit:cover;border-radius:10px;margin:0 auto}
.aviso-columna .aviso-caja{min-height:250px}
.aviso-columna.con-imagen img{aspect-ratio:6/5;max-width:300px}
.aviso-nombre{font:700 18px var(--serif);color:var(--tinta)}
.aviso-texto{font-size:14px;color:var(--suave)}
.aviso-propio .aviso-caja{border-style:dashed;font:600 15px var(--sans);color:var(--tinta)}
.aviso-propio .aviso-caja a{color:var(--rojo);text-decoration:underline;font-weight:700}
.aviso-propio .propio-corto{display:none;font-size:14px}
.aviso-columna.aviso-propio .propio-largo{display:none}
.aviso-columna.aviso-propio .propio-corto{display:inline}
@media(max-width:400px){.aviso-propio .propio-largo{display:none}.aviso-propio .propio-corto{display:inline}}
.aviso-espacio{font:500 11px var(--sans);color:var(--suave)}
.anuncio{display:none;min-height:280px;margin:22px 0;overflow:hidden}
.ads-ok .anuncio{display:block}
.anuncio:has(ins[data-ad-status="unfilled"]){display:none}
.ck{position:fixed;left:0;right:0;bottom:0;z-index:50;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--tinta);color:var(--crema);font-size:13px;box-shadow:0 -2px 10px rgba(0,0,0,.25)}
.ck[hidden]{display:none}
.ck p{margin:0;flex:1 1 320px}
.ck a{text-decoration:underline}
.ck-botones{display:flex;gap:8px}
.ck button{padding:8px 14px;border-radius:999px;border:1.5px solid var(--crema);background:none;color:var(--crema);font:600 13px var(--sans);cursor:pointer}
.ck button.ck-si{background:var(--ambar);border-color:var(--ambar);color:var(--tinta)}
button.enlace{background:none;border:0;padding:0;color:inherit;font:inherit;text-decoration:underline;cursor:pointer}
.texto{max-width:720px;margin:0 auto;font-size:17px;line-height:1.65}
.texto h2{margin:28px 0 8px;font:800 24px/1.2 var(--serif);color:var(--tinta)}
.texto h3{margin:20px 0 6px;font:700 19px var(--serif);color:var(--tinta)}
.texto a{text-decoration:underline;color:var(--rojo)}
.texto ul{padding-left:22px}
.tabla-planes{overflow-x:auto}
.tabla-planes table{width:100%;border-collapse:collapse;background:#fff;font-size:14px;min-width:620px}
.tabla-planes th,.tabla-planes td{padding:9px 10px;border-bottom:1px solid var(--linea);text-align:center}
.tabla-planes th:first-child,.tabla-planes td:first-child{text-align:left;font-weight:600}
.tabla-planes th{font:800 15px var(--serif);background:var(--papel)}
.tabla-planes th small{display:block;font:400 11px var(--sans);color:var(--suave)}
.esquema{max-width:560px;margin:14px auto}
@media(min-width:980px){
.cabeza{grid-template-columns:minmax(0,1.75fr) minmax(0,1fr);grid-template-areas:"ad ad" "hero tira" "hero lat" "hero .";grid-template-rows:auto auto auto 1fr;column-gap:28px}
.cabeza>.sol{margin-bottom:6px}}
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
${p.contexto?.cfBeacon ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='${JSON.stringify({ token: p.contexto.cfBeacon })}'></script>` : ''}
${p.contexto?.config?.adsense?.cliente ? `<meta name="google-adsense-account" content="${esc(p.contexto.config.adsense.cliente)}">` : ''}
${guionDeConsentimiento(p.contexto?.config)}
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
${p.lugarPie === null ? '' : `<div class="ancho">${lugarRotativo(p.contexto, 'pie', p.lugarPie || 'P1')}</div>`}
<footer class="pie"><div class="ancho"><div class="logo">Radar <span>Balcarce</span></div>
<p>Noticias de Balcarce y la zona, todo el día. Medio digital automático: escritas con ayuda de IA, verificadas contra las fuentes; cada nota dice quién la escribió y de qué fuentes sale.</p>
<p><a href="/quienes-somos">Quiénes somos</a> · <a href="/como-trabajamos">Cómo trabajamos</a> · <a href="/contacto">Contacto</a> · <a href="/publicidad">Publicidad</a> · <a href="/politica-de-privacidad">Política de privacidad</a></p>
<p><a href="/rss.xml">RSS</a> · Balcarce, Buenos Aires${cambiarCookies(p.contexto?.config)}</p></div></footer>
${avisoDeCookies(p.contexto?.config)}
${GUION_DEL_MENU}
</body>
</html>`;
}
