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
import {
  aPng, ANCHO, COLORES, colorDeSeccion, repartir, esc, rotulo, renglones, lienzo, pie, TEXTO, MARGEN,
} from './placa.mjs';
import { placaDeNotaDelRepaso, fotoParaElRepaso, rayitas, FOTO } from './escenas/repaso.mjs';
import { armarReel } from './reel.mjs';
import { revisarTexto } from '../redes/guiones.mjs';
import { VOCES } from '../redes/prompt-redes.mjs';

const CARPETA = path.join(import.meta.dirname, 'a-mano');
const SALIDA = path.join(import.meta.dirname, 'salida');

/** El ancho y el alto de una imagen PNG o JPEG (de su encabezado), o null. */
export function medidas(buffer) {
  if (buffer.length > 24 && buffer.readUInt32BE(0) === 0x89504e47) return { ancho: buffer.readUInt32BE(16), alto: buffer.readUInt32BE(20) };
  for (let i = 2; i + 9 < buffer.length;) {
    if (buffer[i] !== 0xff) return null;
    const marca = buffer[i + 1];
    if (marca >= 0xc0 && marca <= 0xc3) return { alto: buffer.readUInt16BE(i + 5), ancho: buffer.readUInt16BE(i + 7) };
    i += 2 + buffer.readUInt16BE(i + 2);
  }
  return null;
}

const ESCALONES_ENTERA = [{ tam: 62, max: 3 }, { tam: 54, max: 3 }, { tam: 48, max: 4 }, { tam: 42, max: 4 }];

/**
 * Una placa con la imagen ENTERA (una infografía, 30/10/2026: Hernán vio las del reel de Nancy chicas y recortadas): la caja toma el alto que
 * pide la imagen, al ancho completo, y la imagen no tiene deriva (el zoom del repaso le cortaba los bordes; acá queda quieta, porque la
 * escena sólo mueve la imagen que está sola adentro de su recorte). Las mismas partes marcadas que la placa del repaso, para que la escena
 * la anime igual (rótulo, cuenta, rayitas, crédito, sección y el titular palabra por palabra).
 */
export function placaEntera({ p, i, n, rotulo: textoDelRotulo, raiz = path.join(import.meta.dirname, '..') }) {
  const buffer = fs.readFileSync(path.join(raiz, 'web', 'public', p.foto));
  const m = medidas(buffer) ?? { ancho: 16, alto: 10 };
  const x = FOTO.x;
  const y = FOTO.y;
  const ancho = FOTO.ancho;
  const alto = Math.min(820, Math.round((ancho * m.alto) / m.ancho));
  const tipo = /\.png$/i.test(p.foto) ? 'image/png' : 'image/jpeg';
  const color = colorDeSeccion(p.seccion);
  const credito = String(p.credito ?? '').trim();
  const yRotulo = y + alto + (credito ? 100 : 72);
  const t = repartir(String(p.titular ?? ''), ESCALONES_ENTERA, ANCHO - MARGEN * 2);
  const inter = Math.round(t.tam * 1.08);
  const yTitular = yRotulo + 24 + Math.round(t.tam * 0.92);
  return lienzo(`
  <g id="rp-rotulo">${rotulo(textoDelRotulo, { y: 304, color: COLORES.rojo })}</g>
  <g id="rp-cuenta"><text x="${ANCHO - MARGEN}" y="304" font-family="${TEXTO}" font-size="28" font-weight="700" text-anchor="end" fill="${COLORES.gris}">${i + 1} de ${n}</text></g>
  <g id="rp-avance" data-i="${i}" data-n="${n}">${rayitas(i, n, COLORES.rojo, 1)}</g>
  <g id="rp-foto"><clipPath id="entera${i}"><rect x="${x}" y="${y}" width="${ancho}" height="${alto}" rx="18"/></clipPath>
    <g clip-path="url(#entera${i})" data-quieta="1"><image href="data:${tipo};base64,${buffer.toString('base64')}" x="${x}" y="${y}" width="${ancho}" height="${alto}" preserveAspectRatio="xMidYMid meet"/></g></g>
  ${credito ? `<g id="rp-credito"><text x="${MARGEN}" y="${y + alto + 42}" font-family="${TEXTO}" font-size="24" font-weight="500" fill="${COLORES.gris}">${esc(credito)}</text></g>` : ''}
  ${p.seccion ? `<g id="rp-seccion">${rotulo(p.seccion, { y: yRotulo, color, tam: 28 })}</g>` : ''}
  <g id="rp-titular">${renglones(t.lineas, { y: yTitular, tam: t.tam, interlinea: inter, espaciado: -1.5 })}</g>
  ${pie()}`);
}

/** Las placas de la pieza, dibujadas como las del repaso. */
export function placasDeLaPieza(pieza) {
  const n = pieza.placas.length;
  return pieza.placas.map((p, i) => {
    if (p.ajuste === 'entera') return { svg: placaEntera({ p, i, n, rotulo: pieza.rotulo }), marca: i === 0 ? null : p.marca };
    const foto = p.foto ? fotoParaElRepaso({ id: `a-mano-${i}`, foto: { archivo: p.foto, credito: p.credito ?? '' } }) : null;
    const svg = placaDeNotaDelRepaso({ nota: { titulo: p.titular, seccion: p.seccion, foto }, i, n, titulo: pieza.rotulo });
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
