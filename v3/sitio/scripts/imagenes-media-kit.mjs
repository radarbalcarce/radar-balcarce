// Las imágenes de la nota del media kit (scripts/nota-media-kit.mjs): láminas de 1200 px de ancho con la marca y lo que ofrecemos,
// SIN precios ni números internos (la página pública no los muestra). Se dibujan con Chrome sin ventana, con las mismas tipografías y colores del kit.
//   node v3/sitio/scripts/imagenes-media-kit.mjs      escribe v3/sitio/media-kit/mediakit-*.png (están en el repositorio; el workflow «sitio» las sube a R2)
// Necesita Chrome o Edge instalado. Sin dependencias.
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';

const aca = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aca, '../../..');
const salida = path.resolve(aca, '../media-kit');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((r) => existsSync(r));

const b64 = (ruta, tipo) => `data:${tipo};base64,${readFileSync(ruta).toString('base64')}`;
const SERIF = b64(path.join(raiz, 'web/public/fuentes/source-serif-4-latin.woff2'), 'font/woff2');
const SANS = b64(path.join(raiz, 'web/public/fuentes/inter-latin.woff2'), 'font/woff2');
const ICONO = b64(path.join(raiz, 'web/public/icon-512.png'), 'image/png');

const CSS = `
@font-face{font-family:"Source Serif 4";font-weight:600 900;src:url("${SERIF}") format("woff2")}
@font-face{font-family:"Inter";font-weight:400 700;src:url("${SANS}") format("woff2")}
:root{--tinta:#14161A;--crema:#F4F1EA;--linea:#E4DFD2;--texto:#3B403C;--rojo:#C7381C;--ambar:#E8A33C}
*{box-sizing:border-box}
html,body{margin:0;width:1200px;background:var(--crema);color:var(--tinta);font:22px/1.45 "Inter",system-ui,sans-serif}
.serif{font-family:"Source Serif 4",Georgia,serif;letter-spacing:-.012em}
.lamina{width:1200px;padding:56px 64px;background:#fff;border:3px solid #D6CFBF;display:flex;flex-direction:column;gap:28px}
.marca{display:flex;align-items:center;gap:28px}
.marca img{width:110px;height:110px;border-radius:26px;box-shadow:0 8px 22px rgba(156,43,21,.28)}
.marca b{display:block;font:800 72px/1 "Source Serif 4",serif}.marca b span{color:var(--rojo)}.oscura .marca b span{color:#E3684D}
.marca p{margin:8px 0 0;font-size:23px;color:var(--texto);max-width:820px}
.banda{background:var(--rojo);color:#fff;padding:18px 64px;margin:0 -64px;display:flex;justify-content:space-between;align-items:baseline;gap:20px}
.banda b{font:800 36px "Source Serif 4",serif}.banda span{font-size:20px;letter-spacing:.1em;text-transform:uppercase;color:#ffd9d0;font-weight:700}
h2{margin:0;font:800 46px/1.12 "Source Serif 4",serif}
.caja{background:#fff;border:1px solid var(--linea);border-radius:20px;padding:26px 30px}
.caja.ambar{border-left:8px solid var(--ambar)}.caja.rojo{border:2px dashed var(--rojo)}
.caja b.t{display:block;font:800 30px/1.2 "Source Serif 4",serif;margin-bottom:8px}
.caja p{margin:0;color:var(--texto)}
.fila{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.num{font:800 54px/1 "Source Serif 4",serif;color:var(--rojo)}
.cita{font:800 44px/1.2 "Source Serif 4",serif;color:var(--rojo)}
.pie{background:var(--tinta);color:#fff;margin:0 -64px -56px;padding:24px 64px;display:flex;justify-content:space-between;align-items:center;gap:30px}
.pie b{display:block;font:800 36px/1 "Source Serif 4",serif;margin-bottom:6px}.pie span{font-size:20px;color:#cfc9bc}.pie .der{text-align:right}
.oscura{background:linear-gradient(135deg,#1B3A4B 0%,#14161A 70%);color:#F4F1EA;border-color:#14161A}.oscura .marca p{color:#CFC9BC}
`;

const MARCA = `<div class="marca"><img src="${ICONO}" alt=""><div><b>Radar <span>Balcarce</span></b><p>El medio digital de Balcarce: noticias, clima, farmacia de turno y agenda, todo el día en el sitio y en las redes, con voz propia.</p></div></div>`;
const PIE = '<div class="pie"><div><b>WhatsApp 2266 51-1612</b><span>Hernán Accomo · Radar Balcarce</span></div><div class="der"><b>radarbalcarce.com</b><span>@radarbalcarce en todas las redes</span></div></div>';

export const LAMINAS = [
  { archivo: 'mediakit-portada.png', alto: 630, html: `<div class="lamina oscura" style="height:630px;justify-content:space-between">${MARCA}
<div><h2 style="font-size:60px">Tu comercio, en el diario<br>de Balcarce y en las redes</h2></div>
<div class="banda" style="margin-bottom:-56px"><b>Publicidad para comercios de Balcarce</b><span>Noviembre y diciembre de 2026</span></div></div>` },
  { archivo: 'mediakit-bienvenida.png', alto: 700, html: `<div class="lamina" style="height:700px"><h2>La bienvenida es para todos</h2>
<p style="margin:0;color:var(--texto)">Cuando un comercio se suma, le hacemos esto, una sola vez y sin cobrarlo aparte:</p>
<div class="fila">
<div class="caja ambar"><div class="num">1</div><b class="t">Una nota</b><p>Sobre tu emprendimiento: quiénes son, qué hacen, tus fotos y tu contacto. Queda en Radar para siempre.</p></div>
<div class="caja ambar"><div class="num">2</div><b class="t">Un reel con voz</b><p>Cuenta esa nota en video, con locución, en Instagram y Facebook.</p></div>
<div class="caja ambar"><div class="num">3</div><b class="t">Una historia</b><p>Que lleva a la nota y dura 24 horas en nuestras redes.</p></div></div>
<div class="caja"><p>Todo lo que decimos lo confirmamos con vos antes de publicar: nada que no hayas dicho.</p></div></div>` },
  { archivo: 'mediakit-clima.png', alto: 700, html: `<div class="lamina" style="height:700px"><h2>El clima de hoy llega con tu comercio</h2>
<div class="caja rojo"><div class="cita">«El clima de hoy llega con tu comercio»</div><p style="margin-top:12px">Eso dice la voz al empezar el reel del clima, y en el video una franja muestra tu comercio y tu Instagram. Y en el diario, un recuadro con tu nombre arriba de la nota del clima y de la página /clima.</p></div>
<div class="fila" style="grid-template-columns:1fr 1fr">
<div class="caja"><b class="t">Lo más visto</b><p>La nota del clima sale a las 7:30; el reel, todos los días.</p></div>
<div class="caja"><b class="t">Un solo auspiciante</b><p>Cada día lleva un solo comercio, por calendario y por orden de llegada.</p></div></div></div>` },
  { archivo: 'mediakit-donde.png', alto: 733, html: `<div class="lamina" style="height:733px"><h2>Dónde se ve tu aviso y cómo arrancar</h2>
<div class="fila" style="grid-template-columns:1fr 1fr">
<div class="caja"><b class="t">En el sitio</b><p><b>Fijo:</b> arriba de las noticias, en la tapa.<br><b>Rotativos:</b> en la tapa, en las notas y en las secciones. Siempre marcado como «Publicidad».</p></div>
<div class="caja"><b class="t">En las redes</b><p>Historias y posteos con tu promoción en nuestro Instagram y Facebook, con foto, texto o video.</p></div></div>
<div class="caja ambar"><b class="t">Cómo arrancar</b><p>Un mensaje por WhatsApp alcanza. Te pedimos el logo, unas fotos, tus datos y unas preguntas cortas que podés responder por audio; nosotros armamos todo.</p></div>
${PIE}</div>` },
];


// --- Dónde se ve tu aviso: capturas REALES del sitio con cada espacio marcado (las saca scripts/capturas-media-kit.mjs) ---
const CAP = path.join(aca, 'capturas-media-kit');
const urlCap = (n) => 'file:///' + path.join(CAP, n + '.png').split(path.sep).join('/');
/** Un recorte de una captura: x, y, w, h en píxeles de la captura original; `e` es la escala. */
const recorte = (nombre, ancho, x, y, w, h, e, extra = '') => `<div class="rec" style="width:${Math.round(w * e)}px;height:${Math.round(h * e)}px;${extra}"><img src="${urlCap(nombre)}" style="width:${Math.round(ancho * e)}px;margin-left:-${Math.round(x * e)}px;margin-top:-${Math.round(y * e)}px"></div>`;
const CSS_LUGARES = `.rec{overflow:hidden;border:2px solid #D6CFBF;border-radius:10px;background:#fff;position:relative}.rec img{display:block;max-width:none}
.pie-c{margin:8px 2px 0;font-size:18px;color:var(--texto);line-height:1.35}.pie-c b{color:var(--tinta)}
.sub{margin:0;color:var(--texto);font-size:23px}
.ley{display:flex;flex-direction:column;gap:12px}.ley .caja{padding:16px 20px;font-size:19px;line-height:1.35}.ley .caja p{font-size:19px}
.et{display:inline-block;min-width:44px;text-align:center;color:#fff;font:800 17px/1 Arial,sans-serif;padding:5px 7px;border-radius:4px;background:#C7381C;margin-right:6px}.et.g{background:#1A6FD6}.et.c{background:#E8A33C;color:#14161A}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:26px 28px}
table.lug{width:100%;border-collapse:collapse;font-size:19px;border:1px solid var(--linea);border-radius:12px;overflow:hidden}.lug th{background:var(--crema);font:800 19px "Source Serif 4",serif;text-align:left;padding:8px 12px}.lug td{padding:7px 12px;border-top:1px solid var(--linea)}`;

/** La tabla corta de los espacios (la misma va en el PDF). */
export const ESPACIOS = [
  ['T1', 'Tapa: fijo, arriba de las noticias', 'Fijo', 'Tapa'],
  ['T2', 'Tapa: después de las notas de la grilla', 'Rotativo', 'Tapa'],
  ['T3', 'Tapa: columna del costado', 'Rotativo', 'Tapa'],
  ['T4', 'Tapa: pie de página', 'Rotativo', 'Tapa'],
  ['N1', 'Nota: arriba (sólo si hay un comercio fijo)', 'Fijo', 'Todas las notas'],
  ['N2', 'Nota: al pie (si no hay fijo)', 'Rotativo', 'Todas las notas'],
  ['S1', 'Sección: arriba de la lista', 'Fijo', 'Todas las secciones'],
  ['S2', 'Sección: al pie', 'Rotativo', 'Todas las secciones'],
  ['C1', 'Auspicio del clima: arriba de la nota diaria y de /clima', 'Uno por día', 'Nota del clima y /clima'],
];
export const filasDeEspacios = () => ESPACIOS.map(([n, d, t, p]) => `<tr><td><span class="et${n === 'C1' ? ' c' : ''}">${n}</span></td><td>${d}</td><td>${t}</td><td>${p}</td></tr>`).join('');

LAMINAS.push(
  { archivo: 'mediakit-lugares-tapa.png', alto: 1490, css: CSS_LUGARES, html: `<div class="lamina" style="height:1490px;padding:40px;gap:20px"><h2>Dónde se ve tu aviso: la tapa</h2>
<p class="sub">Capturas reales de radarbalcarce.com. Cada recuadro de color es un espacio con su nombre.</p>
<div style="display:flex;gap:40px;align-items:flex-start"><div>
${recorte('tapa-1280', 1280, 0, 110, 1280, 2090, 0.547)}
<div class="pie-c" style="margin:10px 0 6px"><b>Más abajo, el pie de la tapa (T4):</b></div>
${recorte('tapa-1280', 1280, 0, 5390, 1280, 190, 0.547)}</div>
<div style="width:380px" class="ley"><div style="font-weight:700;margin-bottom:-4px">En el celular</div>
${recorte('tapa-390', 390, 0, 340, 390, 700, 0.974)}
<div class="caja"><span class="et">T1</span><b>Fijo</b>, arriba de las noticias: lo primero que se ve. Un solo comercio por mes.</div>
<div class="caja"><span class="et">T2</span><span class="et">T3</span><span class="et">T4</span><b>Rotativos</b>: después de la grilla, en la columna del costado y al pie. Se reparten por igual entre todos los que pautan.</div>
<div class="caja"><span class="et g">A3</span> Los azules (A1, A2, A3) son de Google: no se venden.</div></div></div></div>` },
  { archivo: 'mediakit-lugares-paginas.png', alto: 1160, css: CSS_LUGARES, html: `<div class="lamina" style="height:1160px;padding:40px;gap:18px"><h2>Dónde se ve tu aviso: notas, secciones y clima</h2>
<div class="g2">
<div>${recorte('nota-1280', 1280, 0, 1600, 1280, 460, 0.43)}<div class="pie-c"><b>Nota</b>: N2 al pie. Si hay un comercio fijo, además va arriba (N1).</div></div>
<div>${recorte('clima-1280', 1280, 0, 150, 1280, 460, 0.43)}<div class="pie-c"><b>Clima</b>: C1, el auspicio. Está arriba de la nota diaria y de la página /clima.</div></div>
<div>${recorte('seccion-1280', 1280, 0, 130, 1280, 460, 0.43)}<div class="pie-c"><b>Sección</b>: S1, fijo, arriba de la lista.</div></div>
<div>${recorte('seccion-1280', 1280, 0, 1990, 1280, 460, 0.43)}<div class="pie-c"><b>Sección</b>: S2, al pie. Los azules son de Google (no se venden).</div></div></div>
<table class="lug"><tr><th>Espacio</th><th>Dónde</th><th>Tipo</th><th>Páginas</th></tr>${filasDeEspacios()}
<tr><td><span class="et g">A1</span><span class="et g">A2</span><span class="et g">A3</span></td><td>Dentro de la nota, al final de la sección, al pie de la tapa</td><td colspan="2">De Google: no se venden</td></tr></table></div>` },
);

export function armarHtml(lamina) {
  return `<!doctype html><html lang="es-AR"><head><meta charset="utf-8"><style>${CSS}${lamina.css || ''}</style></head><body>${lamina.html}</body></html>`;
}

function main() {
  if (!CHROME) { console.error('No encontré Chrome ni Edge.'); process.exit(1); }
  mkdirSync(salida, { recursive: true });
  const tmp = mkdtempSync(path.join(tmpdir(), 'mediakit-'));
  for (const l of LAMINAS) {
    const html = path.join(tmp, `${l.archivo}.html`);
    writeFileSync(html, armarHtml(l));
    const destino = path.join(salida, l.archivo);
    const r = spawnSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', `--user-data-dir=${path.join(tmp, 'perfil')}`,
      `--window-size=1200,${l.alto}`, `--screenshot=${destino}`, `file:///${html.replace(/\\/g, '/')}`], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(`Falló ${l.archivo}: ${r.stderr}`); process.exit(1); }
    console.log(`Listo: ${destino}`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
