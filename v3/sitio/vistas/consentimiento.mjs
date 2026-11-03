// El aviso de cookies y la carga de AdSense / Google Analytics. Todo depende de dos variables del Worker:
//   ADSENSE_CLIENTE  «ca-pub-1234567890123456» (o «pub-…»)       GA_ID  «G-XXXXXXXXXX»
// Si no hay ninguna, no existe aviso, ni script, ni /ads.txt. Con alguna, el aviso aparece abajo hasta que el lector elige,
// y lo elegido queda en una cookie propia (`radar_cookies`, 6 meses). Los scripts de Google sólo se cargan si eligió «Aceptar».
import { esc } from '../util.mjs';

export const COOKIE = 'radar_cookies';
export const SEIS_MESES = 15724800; // 182 días, en segundos

/** Lee las variables del Worker y descarta las que no tienen la forma correcta. null si no hay nada que pida consentimiento. */
export function configDe(env = {}) {
  const crudo = String(env.ADSENSE_CLIENTE ?? '').trim();
  const m = /^(?:ca-)?(pub-\d{10,20})$/.exec(crudo);
  const ga = /^G-[A-Z0-9]{4,15}$/.exec(String(env.GA_ID ?? '').trim());
  const slot = (v) => (/^\d{6,15}$/.test(String(v ?? '').trim()) ? String(v).trim() : null);
  if (!m && !ga) return null;
  return {
    adsense: m ? { cliente: `ca-${m[1]}`, publicador: m[1], slotNota: slot(env.ADSENSE_SLOT_NOTA), slotSeccion: slot(env.ADSENSE_SLOT_SECCION) } : null,
    ga: ga ? ga[0] : null,
  };
}

/** El texto de /ads.txt, o null si no hay AdSense. */
export const adsTxt = (config) => (config?.adsense ? `google.com, ${config.adsense.publicador}, DIRECT, f08c47fec0942fa0\n` : null);

/** El script del <head>: si el lector ya aceptó, carga lo de Google; si no, espera. Los identificadores ya vienen validados. */
export function guionDeConsentimiento(config) {
  if (!config) return '';
  const datos = JSON.stringify({ a: config.adsense?.cliente ?? null, g: config.ga ?? null, c: COOKIE, t: SEIS_MESES }).replace(/</g, '\\u003c');
  return `<script>(function(){var D=${datos},d=document,h=d.documentElement,ya=0;
function leer(){var m=d.cookie.match(new RegExp('(?:^|; )'+D.c+'=(\\\\w+)'));return m?m[1]:null}
function cargar(){if(ya)return;ya=1;h.className+=' ads-ok';
if(D.a){var s=d.createElement('script');s.async=true;s.crossOrigin='anonymous';s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+D.a;d.head.appendChild(s);
var p=function(){var l=d.querySelectorAll('ins.adsbygoogle');for(var i=0;i<l.length;i++){try{(window.adsbygoogle=window.adsbygoogle||[]).push({})}catch(e){}}};
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',p);else p()}
if(D.g){var g=d.createElement('script');g.async=true;g.src='https://www.googletagmanager.com/gtag/js?id='+D.g;d.head.appendChild(g);window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments)};window.gtag('js',new Date());window.gtag('config',D.g)}}
function guardar(v){d.cookie=D.c+'='+v+'; Max-Age='+D.t+'; Path=/; SameSite=Lax; Secure'}
function ui(){var b=d.getElementById('ck');if(!b)return;
if(!leer())b.hidden=false;
d.getElementById('ck-si').addEventListener('click',function(){guardar('todas');b.hidden=true;cargar()});
d.getElementById('ck-no').addEventListener('click',function(){guardar('necesarias');b.hidden=true});
var c=d.getElementById('ck-cambiar');if(c)c.addEventListener('click',function(){b.hidden=false;d.getElementById('ck-si').focus()})}
if(leer()==='todas')cargar();
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',ui);else ui()})()</script>`;
}

/** El cartel de abajo. Arranca escondido: el guion lo muestra sólo si el lector todavía no eligió. */
export function avisoDeCookies(config) {
  if (!config) return '';
  const que = [config.adsense ? 'anuncios de Google AdSense' : null, config.ga ? 'la medición de Google Analytics' : null].filter(Boolean).join(' y ');
  return `<div id="ck" class="ck" role="region" aria-label="Cookies" hidden><p>Usamos una cookie propia para recordar tu elección y, si aceptás, cookies de Google para ${esc(que)}. Con «Sólo necesarias» no se carga nada de terceros. <a href="/politica-de-privacidad#cookies">Más información</a></p><div class="ck-botones"><button type="button" id="ck-no">Sólo necesarias</button><button type="button" id="ck-si" class="ck-si">Aceptar</button></div></div>`;
}

/** El botón del pie para volver a elegir. */
export const cambiarCookies = (config) => (config ? ' · <button type="button" id="ck-cambiar" class="enlace">Cookies</button>' : '');
