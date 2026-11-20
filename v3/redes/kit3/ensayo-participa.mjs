// Ensayo MUDO de las convocatorias «Participá» con el kit 3.0 (sin voz, sin IA, sin red, sin publicar): arma cada pieza con su armador, la dibuja con subtítulos estimados (2,5 palabras por segundo)
// y deja por pieza <nombre>.mp4, <nombre>-tapa.png, <nombre>-tapa-grilla.png y <nombre>-hoja.png (4 cuadros con la zona que tapa Instagram marcada en rojo: la franja de abajo desde la fila 1540, la columna de íconos de la
// derecha). Uso:
//   node v3/redes/kit3/ensayo-participa.mjs [--salida D:\ruta] [--solo-tapa] [noticia nota evento marca-a marca-b]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { armarParticipa } from '../piezas/armadores.mjs';
import { dibujarConKit3 } from './kit3.mjs';
import { desdePieza } from './desde-pieza.mjs';
import { T0 } from './variables.mjs';

const PIEZAS = {
  noticia: () => armarParticipa('noticia', { hora: 17, saludo: null }),
  nota: () => armarParticipa('nota', { hora: 17, saludo: null }),
  evento: () => armarParticipa('evento', { hora: 17, saludo: null }),
  'marca-a': () => armarParticipa('marca', { hora: 17, saludo: null, diseno: 'a' }),
  'marca-b': () => armarParticipa('marca', { hora: 17, saludo: null, diseno: 'b' }),
};

async function ffmpegDelRepo() { try { const { default: f } = await import('ffmpeg-static'); if (f) return f; } catch { /* sigue */ } return 'ffmpeg'; }

/** Los 4 instantes que muestra la hoja de cada pieza (segundos del video): los momentos clave de cada diseño, sacados de las marcas de la voz (la tapa no entra: se mira aparte). */
export function instantesDeLaHoja(spec) {
  const { m, c } = spec.datos;
  const fin = spec.dur + T0 - 0.35;
  const v = {
    viste: [m.mandanos + 2.0, spec.datos.tRespuesta + 1.0, c.whatsapp + 1.4, fin],
    marcaA: [m.noticias + 0.9, m.contamos + 1.9, c.espacio + 0.6, fin], marcaB: [m.noticias + 0.9, m.contamos + 1.9, c.espacio + 0.6, fin],
    nota: [m.barrio + 0.9, m.historia + 0.9, c.mail + 1.4, fin],
    evento: [m.donde + 1.0, m.agenda + 1.1, c.mail + 1.6, fin],
  }[spec.datos.variante];
  return v.map((s) => Number((s + T0).toFixed(2)));
}

/** La hoja de 4 cuadros (en `instantes`, o a 30 %, 50 %, 72 % y 92 % del video) con la zona tapada por Instagram en rojo. */
export async function hojaDeCuadros(mp4, destino, duracion, instantes = null) {
  const ffmpeg = await ffmpegDelRepo();
  const tmp = fs.mkdtempSync(path.join(path.dirname(destino), 'cuadros-'));
  const marca = 'drawbox=x=950:y=1100:w=130:h=440:color=red@0.28:t=fill,drawbox=x=0:y=1540:w=1080:h=380:color=red@0.35:t=fill,drawbox=x=0:y=1540:w=1080:h=4:color=red@0.9:t=fill';
  const cuadros = (instantes ?? [0.30, 0.50, 0.72, 0.92].map((f) => duracion * f)).map((seg, i) => {
    const png = path.join(tmp, `c${i}.png`);
    spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-ss', String(Number(Math.min(seg, duracion - 0.1).toFixed(2))), '-i', mp4, '-frames:v', '1', '-vf', `${marca},scale=540:960`, png]);
    return png;
  });
  const r = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', ...cuadros.flatMap((c) => ['-i', c]), '-filter_complex', 'hstack=inputs=4', destino]);
  fs.rmSync(tmp, { recursive: true, force: true });
  if (r.status !== 0) throw new Error(String(r.stderr));
}

async function main() {
  const args = process.argv.slice(2);
  const i = args.indexOf('--salida');
  const salida = path.resolve(i >= 0 ? args[i + 1] : 'salida-participa');
  const soloTapa = args.includes('--solo-tapa');
  const conMusica = args.includes('--musica'); // prende la música del kit sólo para este ensayo (sin voz: suena más fuerte para poder oírla)
  const pedidas = args.filter((a, k) => !a.startsWith('--') && args[k - 1] !== '--salida');
  const lista = pedidas.length ? pedidas : ['noticia', 'nota', 'evento'];
  fs.mkdirSync(salida, { recursive: true });
  for (const nombre of lista) {
    if (!PIEZAS[nombre]) { console.log(`no conozco «${nombre}» (hay: ${Object.keys(PIEZAS).join(', ')})`); continue; }
    const pieza = PIEZAS[nombre]();
    const destino = path.join(salida, `${nombre}.mp4`);
    const r = await dibujarConKit3(pieza, destino, { soloTapa, env: { ...process.env, ...(conMusica ? { MUSICA_3_0: 'si' } : {}) }, log: (t) => console.log(`  ${t}`) });
    if (!soloTapa) await hojaDeCuadros(destino, path.join(salida, `${nombre}-hoja.png`), r.duracion, instantesDeLaHoja(desdePieza(pieza)));
    fs.writeFileSync(path.join(salida, `${nombre}.json`), JSON.stringify({ guion: pieza.guion, duracion: r.duracion, avisos: r.avisos, creditos: r.creditos }, null, 2));
    console.log(`${nombre}: listo · ${r.duracion} s`);
  }
}
const esElPrograma = process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(path.resolve(process.argv[1])).href;
if (esElPrograma) main().catch((e) => { console.error(e.stack || e); process.exit(1); });
