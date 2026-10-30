// El video promocional de Radar Balcarce (30/10/2026, Hernán: «de forma animada nada más, un video para ver cómo quedaría a modo publicitario;
// después vemos de ponerle voz»). SIN VOZ y sin publicar: arma un mp4 con la misma estética y la misma animación de los reels de noticias
// (la secuencia del repaso, reels/escenas/repaso.mjs): la tapa con los titulares del momento, cuatro notas con su foto, de secciones distintas
// (primero las de Balcarce), y el cierre con las redes. Las notas salen de lo publicado (web/data/portada.json), con fotos ya revisadas.
//
// Uso: node reels/promo.mjs   → reels/salida/promo-radar.mp4
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import { placaRepaso, placaParticipa, COLORES } from './placa.mjs';
import { placaDeNotaDelRepaso, fotoParaElRepaso, escenaDelRepaso } from './escenas/repaso.mjs';
import { renderizarLinea, FPS } from './animacion.mjs';

const RAIZ = path.join(import.meta.dirname, '..');
const SALIDA = path.join(import.meta.dirname, 'salida');
const leer = (r) => JSON.parse(fs.readFileSync(path.join(RAIZ, r), 'utf8'));

/** Cuatro notas con foto, de secciones distintas: primero lo de Balcarce, después lo más contado. */
export function notasParaLaPromo(notas, banco = {}, cuantas = 4) {
  const conFoto = notas.filter((n) => !n.propia && n.foto?.archivo && !/^ilustraci/i.test(String(n.foto.credito ?? '')) && n.semaforo !== 'rojo'
    // Una publicidad no muestra muertes, crímenes ni policiales: lo de la promo tiene que invitar.
    && n.seccion !== 'Policiales' && !/muri|falleci|muerte|crimen|asesin|femicid|herid|tragedia|detenid/i.test(n.titulo));
  const orden = (a, b) => (Number(b.seccion === 'Balcarce') - Number(a.seccion === 'Balcarce')) || ((b.medios?.length ?? 0) - (a.medios?.length ?? 0));
  const elegidas = [];
  const secciones = new Set();
  for (const n of [...conFoto].sort(orden)) {
    if (secciones.has(n.seccion)) continue;
    const foto = fotoParaElRepaso(n, { banco });
    if (!foto) continue;
    secciones.add(n.seccion);
    elegidas.push({ titulo: n.titulo, seccion: n.seccion, foto });
    if (elegidas.length >= cuantas) break;
  }
  return elegidas;
}

async function main() {
  const portada = leer('web/data/portada.json');
  const banco = leer('web/data/banco-fotos.json');
  const notas = notasParaLaPromo(portada.notas ?? [], banco);
  if (notas.length < 2) throw new Error('no hay notas con foto suficientes');
  const rotulo = 'Radar Balcarce';
  const tapa = placaRepaso({ titulo: 'Todo lo que pasa en Balcarce', momento: 'Radar Balcarce', notas: notas.map((n) => ({ seccion: n.seccion, titulo: n.titulo })), color: COLORES.rojo });
  const cierre = placaParticipa({
    rotulo: 'Seguinos', pregunta: 'Balcarce y la región, en un solo lugar',
    pie1: 'Instagram, Facebook, TikTok, YouTube y X: @radarbalcarce.', pie2: 'Las noticias de acá, a toda hora, en radarbalcarce.com.',
    mail: 'redaccion@radarbalcarce.com',
  });
  const CADA = 3.6;
  const placas = [
    ...notas.map((nota, i) => ({ svg: placaDeNotaDelRepaso({ nota, i, n: notas.length, titulo: rotulo }), desde: i === 0 ? 0 : 0.6 + i * CADA })),
    { svg: cierre, desde: 0.6 + notas.length * CADA },
  ];
  const total = placas.at(-1).desde + 4.5;
  const escena = escenaDelRepaso({ placas, tapa, total });
  if (!escena) throw new Error('no se pudo armar la escena');
  fs.mkdirSync(SALIDA, { recursive: true });
  const { secuencia } = await renderizarLinea(escena, SALIDA, 'promo-a0-', { duracion: total, linea: escena.linea(total) });
  const mp4 = path.join(SALIDA, 'promo-radar.mp4');
  await promisify(execFile)(ffmpeg, [
    '-y', '-framerate', String(FPS), '-i', secuencia, '-t', total.toFixed(2),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(FPS), mp4,
  ], { maxBuffer: 1024 * 1024 * 40 });
  for (const f of fs.readdirSync(SALIDA)) if (f.startsWith('promo-a0-')) fs.rmSync(path.join(SALIDA, f), { force: true });
  console.log(`${mp4} (${total.toFixed(1)} s, ${notas.length} notas: ${notas.map((n) => n.seccion).join(', ')})`);
}

if (process.argv[1]?.endsWith('promo.mjs')) await main();
