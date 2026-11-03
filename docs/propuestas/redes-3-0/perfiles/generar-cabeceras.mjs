// Genera las cabeceras de perfil (Bluesky 3000x1000, WhatsApp Business 1920x1080).
// Uso: node docs/propuestas/redes-3-0/perfiles/generar-cabeceras.mjs  (desde la raíz del repo)
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const F = (n) => path.join(raiz, 'reels/marca/fuentes', n);
const salida = path.dirname(fileURLToPath(import.meta.url));
const SERIF = 'Source Serif 4 60pt', SANS = 'Inter';

// Anillos de radar, barrido y puntos ámbar (la misma estética del avatar).
function radar(cx, cy, radios, idp) {
  const aros = radios.map((r, i) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#C7381C" stroke-opacity="${(0.34 - i * 0.05).toFixed(2)}" stroke-width="${3 - i * 0.3}"/>`).join('');
  const R = radios[radios.length - 1];
  return `<defs><radialGradient id="${idp}b" cx="${cx}" cy="${cy}" r="${R}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#C7381C" stop-opacity=".0"/><stop offset="1" stop-color="#C7381C" stop-opacity=".16"/></radialGradient></defs>
  <path d="M${cx} ${cy} L${cx + R} ${cy} A${R} ${R} 0 0 0 ${cx + R * Math.cos(-0.9)} ${cy + R * Math.sin(-0.9)} Z" fill="url(#${idp}b)"/>
  ${aros}
  <line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="#F4F1EA" stroke-opacity=".05" stroke-width="2"/>
  <line x1="${cx}" y1="${cy - R}" x2="${cx}" y2="${cy + R}" stroke="#F4F1EA" stroke-opacity=".05" stroke-width="2"/>`;
}
const puntos = (ps) => ps.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r * 2.6}" fill="#E8A33C" fill-opacity=".14"/><circle cx="${x}" cy="${y}" r="${r}" fill="#E8A33C"/>`).join('');

const fondo = (w, h) => `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1B4A5E"/><stop offset=".55" stop-color="#14161A"/><stop offset="1" stop-color="#14161A"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#g)"/>`;

const logo = (x, y, tam, ancla = 'middle') => `
<text x="${x}" y="${y}" text-anchor="${ancla}" font-family="${SERIF}" font-weight="900" font-size="${tam}" letter-spacing="-2"><tspan fill="#F4F1EA">Radar </tspan><tspan fill="#D8412A">Balcarce</tspan></text>`;

// ---- Bluesky 3000x1000 ----
// Zona segura: centro (x 700–2300). Abajo-izquierda (0–700, y>500) queda libre para el avatar.
const bsky = `<svg xmlns="http://www.w3.org/2000/svg" width="3000" height="1000" viewBox="0 0 3000 1000">
${fondo(3000, 1000)}
${radar(1500, 500, [260, 470, 700, 960], 'a')}
${radar(2780, 130, [170, 330, 520], 'c')}
${puntos([[1930, 300, 9], [1020, 330, 7], [2150, 690, 6], [2640, 330, 8], [830, 150, 5]])}
${logo(1500, 470, 210)}
<rect x="1180" y="520" width="640" height="5" rx="2" fill="#E8A33C"/>
<text x="1500" y="625" text-anchor="middle" font-family="${SANS}" font-weight="600" font-size="52" fill="#F4F1EA">Todo lo que pasa en Balcarce y la región,</text>
<text x="1500" y="695" text-anchor="middle" font-family="${SANS}" font-weight="600" font-size="52" fill="#F4F1EA">en un solo lugar</text>
<text x="1500" y="800" text-anchor="middle" font-family="${SANS}" font-weight="700" font-size="40" letter-spacing="6" fill="#E8A33C">RADARBALCARCE.COM</text>
</svg>`;

// ---- WhatsApp 1920x1080 ----
const wa = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
${fondo(1920, 1080)}
${radar(960, 540, [300, 520, 760, 1040], 'a')}
${puntos([[1330, 250, 9], [560, 300, 7], [1420, 820, 7], [470, 760, 6], [1560, 760, 5]])}
${logo(960, 500, 200)}
<rect x="700" y="545" width="520" height="6" rx="3" fill="#E8A33C"/>
<text x="960" y="650" text-anchor="middle" font-family="${SANS}" font-weight="600" font-size="48" fill="#F4F1EA">Todo lo que pasa en Balcarce</text>
<text x="960" y="712" text-anchor="middle" font-family="${SANS}" font-weight="600" font-size="48" fill="#F4F1EA">y la región, en un solo lugar</text>
<text x="960" y="830" text-anchor="middle" font-family="${SANS}" font-weight="700" font-size="40" letter-spacing="6" fill="#E8A33C">RADARBALCARCE.COM</text>
</svg>`;

const opciones = { font: { fontFiles: [F('SourceSerif4-900.ttf'), F('SourceSerif4-700.ttf'), F('Inter-600.ttf'), F('Inter-700.ttf')], loadSystemFonts: false, defaultFontFamily: SANS } };
for (const [nombre, svg] of [['bluesky-cabecera.png', bsky], ['whatsapp-portada.png', wa]]) {
  writeFileSync(path.join(salida, nombre), new Resvg(svg, opciones).render().asPng());
  console.log('listo', nombre);
}
