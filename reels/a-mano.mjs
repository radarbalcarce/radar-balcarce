// Reels a pedido (30/10/2026, Hernán: «el reel de Nancy y el de la Fiesta del Postre»): arma un video con voz a partir de un archivo de
// reels/a-mano/<nombre>.json, con el mismo motor y la MISMA ESTÉTICA que los reels de noticias (Hernán, 30/10: «no mantiene la estética de
// Radar Balcarce»): la secuencia animada del repaso (reels/escenas/repaso.mjs), con la foto de la nota, su crédito abajo, el rótulo, las
// rayitas de avance y el titular grande, que cambian cuando la voz llega a cada parte. NO publica nada: el workflow «Reel a mano» deja el
// video para descargar y una persona decide si lo sube. Gasta un audio del cupo de voz por pieza.
//
// El archivo: {
//   "rotulo": "lo que va arriba, en rojo",
//   "placas": [{ "foto": "fotos-notas/x.jpg", "credito": "Foto: …", "seccion": "Balcarce", "titular": "…",
//                "marca": "las primeras palabras de la oración del guion con la que entra (la primera no lleva)", "ajuste": "entera" }],
//   "guion": "lo que dice la voz"
// }
// `ajuste: "entera"` muestra la imagen completa (una infografía) en vez de recortarla para llenar la caja.
// Uso: node reels/a-mano.mjs nancy,postre
import fs from 'node:fs';
import path from 'node:path';
import { aPng } from './placa.mjs';
import { placaDeNotaDelRepaso, fotoParaElRepaso } from './escenas/repaso.mjs';
import { armarReel } from './reel.mjs';
import { revisarTexto } from '../redes/guiones.mjs';
import { VOCES } from '../redes/prompt-redes.mjs';

const CARPETA = path.join(import.meta.dirname, 'a-mano');
const SALIDA = path.join(import.meta.dirname, 'salida');

/** Las placas de la pieza, dibujadas como las del repaso. */
export function placasDeLaPieza(pieza) {
  const n = pieza.placas.length;
  return pieza.placas.map((p, i) => {
    const foto = p.foto ? fotoParaElRepaso({ id: `a-mano-${i}`, foto: { archivo: p.foto, credito: p.credito ?? '' } }) : null;
    let svg = placaDeNotaDelRepaso({ nota: { titulo: p.titular, seccion: p.seccion, foto }, i, n, titulo: pieza.rotulo });
    if (p.ajuste === 'entera') svg = svg.replace('preserveAspectRatio="xMidYMid slice"', 'preserveAspectRatio="xMidYMid meet"');
    return { svg, marca: i === 0 ? null : p.marca };
  });
}

if (process.argv[1]?.endsWith('a-mano.mjs')) {
  const cuales = String(process.argv[2] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!cuales.length) {
    console.log(`Decí qué reels armar: ${fs.readdirSync(CARPETA).map((f) => f.replace(/\.json$/, '')).join(', ')}`);
    process.exit(1);
  }
  fs.mkdirSync(SALIDA, { recursive: true });
  let fallas = 0;
  for (const nombre of cuales) {
    const pieza = JSON.parse(fs.readFileSync(path.join(CARPETA, `${nombre}.json`), 'utf8'));
    const placas = placasDeLaPieza(pieza);
    const problemas = revisarTexto(pieza.guion, { tipo: 'voz' });
    if (problemas?.length) console.log(`  ${nombre}: el guion tiene observaciones: ${JSON.stringify(problemas)}`);
    for (const [i, p] of placas.entries()) await aPng(p.svg, path.join(SALIDA, `reel-${nombre}-placa-${i + 1}.png`));
    if (process.argv.includes('--solo-placas')) continue;
    try {
      const r = await armarReel({
        nombre: `reel-${nombre}`, svg: placas[0].svg, guion: pieza.guion, vozGemini: VOCES.locutora,
        secuencia: { placas, tapa: placas[0].svg },
      }, SALIDA);
      console.log(`  ${nombre}: ${path.basename(r.mp4)} (${r.duracion} s)`);
    } catch (e) {
      fallas += 1;
      console.log(`  ${nombre}: no se pudo armar (${e.message})`);
    }
  }
  process.exit(fallas ? 1 : 0);
}
