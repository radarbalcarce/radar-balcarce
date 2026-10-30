// Reels a pedido (30/10/2026, Hernán: «el reel de Nancy y el de la Fiesta del Postre»): arma un video con voz a partir de un archivo de
// reels/a-mano/<nombre>.json, con el mismo motor de siempre (armarReel) y la voz de la locutora. NO publica nada: el workflow
// «Reel a mano» deja el video para descargar y una persona decide si lo sube. Gasta un audio del cupo de voz por pieza.
//
// El archivo: { "placa": { "tipo": "efemeride" | "participa", ...lo que pide esa placa }, "guion": "lo que dice la voz" }.
// Uso: node reels/a-mano.mjs nancy,postre
import fs from 'node:fs';
import path from 'node:path';
import { placaEfemeride, placaParticipa, aPng, COLOR_SECCION } from './placa.mjs';
import { armarReel } from './reel.mjs';
import { revisarTexto } from '../redes/guiones.mjs';
import { VOCES } from '../redes/prompt-redes.mjs';

const CARPETA = path.join(import.meta.dirname, 'a-mano');
const SALIDA = path.join(import.meta.dirname, 'salida');
const PLACAS = { efemeride: placaEfemeride, participa: placaParticipa };

const cuales = String(process.argv[2] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
if (!cuales.length) {
  console.log(`Decí qué reels armar: ${fs.readdirSync(CARPETA).map((f) => f.replace(/\.json$/, '')).join(', ')}`);
  process.exit(1);
}
fs.mkdirSync(SALIDA, { recursive: true });
let fallas = 0;
for (const nombre of cuales) {
  const pieza = JSON.parse(fs.readFileSync(path.join(CARPETA, `${nombre}.json`), 'utf8'));
  const { tipo, seccion, ...datos } = pieza.placa;
  const svg = PLACAS[tipo]({ ...datos, ...(seccion ? { color: COLOR_SECCION[seccion] ?? COLOR_SECCION.Balcarce } : {}) });
  const problemas = revisarTexto(pieza.guion, { tipo: 'voz' });
  if (problemas?.length) console.log(`  ${nombre}: el guion tiene observaciones: ${JSON.stringify(problemas)}`);
  await aPng(svg, path.join(SALIDA, `reel-${nombre}-placa.png`));
  try {
    const r = await armarReel({ nombre: `reel-${nombre}`, svg, guion: pieza.guion, vozGemini: VOCES.locutora }, SALIDA);
    console.log(`  ${nombre}: ${path.basename(r.mp4)} (${r.duracion} s)`);
  } catch (e) {
    fallas += 1;
    console.log(`  ${nombre}: no se pudo armar (${e.message})`);
  }
}
process.exit(fallas ? 1 : 0);
