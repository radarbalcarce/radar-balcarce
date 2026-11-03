// Capturas REALES del sitio publicado para la lámina «Dónde se ve tu aviso» del media kit (nota del sitio y PDF).
//   node v3/sitio/scripts/capturas-media-kit.mjs [https://radarbalcarce.com]
// Para cada página saca una captura entera (PC 1280 px, celular 390 px dentro de un iframe) con cada [data-lugar] pintado con un recuadro y su nombre,
// y guarda al lado un .json con la posición (getBoundingClientRect) de cada espacio. Todo va a v3/sitio/scripts/capturas-media-kit/.
// Las láminas (imagenes-media-kit.mjs) usan esas capturas; no hace falta repetir esto salvo que el sitio cambie mucho.
// Necesita Chrome instalado. Sin dependencias.
import { writeFileSync, mkdirSync, mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';

const aca = path.dirname(fileURLToPath(import.meta.url));
export const CARPETA = path.join(aca, 'capturas-media-kit');
const SITIO = (process.argv[2] || 'https://radarbalcarce.com').replace(/\/$/, '');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((r) => existsSync(r));

// [nombre, ruta, anchos]
export const PAGINAS = [
  ['tapa', '/', [1280, 390]],
  ['nota', '/nota/comenzo-la-segunda-edicion-del-programa-mujeres-al-volante-en-balcarce-c287c8y', [1280, 390]],
  ['seccion', '/seccion/balcarce', [1280]],
  ['clima', '/clima', [1280]],
];

const ESTILO = `<style>
[data-lugar]{outline:6px solid #C7381C!important;outline-offset:-3px;position:relative!important;min-height:64px;background-color:rgba(199,56,28,.10)!important;overflow:visible!important}
[data-lugar]::after{content:attr(data-lugar);position:absolute;left:0;top:0;background:#C7381C;color:#fff;font:800 34px/1 Arial,sans-serif;padding:8px 14px;z-index:99999}
[data-lugar^="A"]{outline-color:#1A6FD6!important;background-color:rgba(26,111,214,.10)!important}[data-lugar^="A"]::after{background:#1A6FD6}
[data-lugar="C1"]{outline-color:#E8A33C!important}[data-lugar="C1"]::after{background:#E8A33C;color:#14161A}
</style>`;
// Mide los espacios y esconde el cartel de cookies (lo arma el sitio con JS y es fijo: taparía el pie de la captura).
const GUION = `<script>addEventListener('load',()=>setTimeout(()=>{
for(const e of document.querySelectorAll('body *')){const s=getComputedStyle(e);if(s.position==='fixed'&&/cookie/i.test(e.textContent||'')&&(e.textContent||'').length<600)e.style.display='none';}
const r=[...document.querySelectorAll('[data-lugar]')].map(e=>{const b=e.getBoundingClientRect();return{lugar:e.getAttribute('data-lugar'),x:Math.round(b.left),y:Math.round(b.top+scrollY),w:Math.round(b.width),h:Math.round(b.height)}});
parent.document.body.setAttribute('data-medidas',JSON.stringify({alto:Math.ceil(document.documentElement.scrollHeight),lugares:r}));},1500));</script>`;

function chrome(args) { return spawnSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--virtual-time-budget=8000', ...args], { encoding: 'utf8', maxBuffer: 1 << 28 }); }

async function main() {
  if (!CHROME) { console.error('No encontré Chrome ni Edge.'); process.exit(1); }
  mkdirSync(CARPETA, { recursive: true });
  const tmp = mkdtempSync(path.join(tmpdir(), 'capmk-'));
  const perfil = `--user-data-dir=${path.join(tmp, 'perfil')}`;
  for (const [nombre, ruta, anchos] of PAGINAS) {
    let h = await (await fetch(SITIO + ruta)).text();
    h = h.replace('<head>', `<head><base href="${SITIO}/">`).replace('</head>', ESTILO + GUION + '</head>');
    const srcdoc = h.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    for (const ancho of anchos) {
      const envoltorio = (alto) => `<!doctype html><html><body style="margin:0"><iframe style="border:0;display:block;width:${ancho}px;height:${alto}px" srcdoc="${srcdoc}"></iframe></body></html>`;
      const f1 = path.join(tmp, `${nombre}-${ancho}-a.html`); writeFileSync(f1, envoltorio(900));
      const dom = chrome([perfil, `--window-size=${ancho},900`, '--dump-dom', pathToFileURL(f1).href]).stdout;
      const m = /data-medidas="([^"]*)"/.exec(dom);
      if (!m) { console.error('No pude medir', nombre, ancho); continue; }
      const medidas = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
      const alto = Math.min(medidas.alto, 9000);
      const f2 = path.join(tmp, `${nombre}-${ancho}-b.html`); writeFileSync(f2, envoltorio(alto));
      const png = path.join(CARPETA, `${nombre}-${ancho}.png`);
      const r = chrome([perfil, `--window-size=${ancho},${alto}`, `--screenshot=${png}`, pathToFileURL(f2).href]);
      if (r.status !== 0) { console.error('Falló', nombre, ancho, r.stderr); continue; }
      writeFileSync(path.join(CARPETA, `${nombre}-${ancho}.json`), JSON.stringify({ ancho, alto, lugares: medidas.lugares }, null, 1));
      console.log(`Listo: ${nombre}-${ancho} (${alto} px; ${medidas.lugares.map((l) => l.lugar).join(' ')})`);
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
