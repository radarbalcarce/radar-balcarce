// Prepara los fondos de video del clima para el kit 3.0 (una vez, en una PC; NO se sube nada al repositorio: los clips son de stock con licencia Pexels / Mixkit y pesan).
//
//   node v3/redes/kit3/fondos/preparar.mjs <carpeta con indice.json y los clips originales> <carpeta de salida>
//   por ejemplo: node v3/redes/kit3/fondos/preparar.mjs D:\BalcarDev\RadarMedia\fondos-clima D:\BalcarDev\RadarMedia\fondos-clima-kit3
//
// Cada clip sale a 1296 × 1920 (9:16 con 216 px de margen para el paneo lento del kit), 30 cuadros, hasta 20 s, H.264 sin audio, y se escribe `fondos.json` (el manifiesto del repositorio:
// estado del cielo → archivos, origen y licencia). La carpeta de salida es la que se sube al depósito R2 `radar-fotos`, en `kit3/fondos/` (ver `LEEME.md`).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [origen, salida] = process.argv.slice(2);
if (!origen || !salida) { console.error('uso: node preparar.mjs <carpeta de origen con indice.json> <carpeta de salida>'); process.exit(1); }
const indice = JSON.parse(fs.readFileSync(path.join(origen, 'indice.json'), 'utf8'));
const estados = {};
let hechos = 0;
for (const c of indice.clips) {
  const entrada = path.join(origen, c.archivo);
  const destino = path.join(salida, c.archivo);
  const archivo = c.archivo.replace(/\\/g, '/');
  (estados[c.estado] ??= []).push({ archivo, origen: c.url_pagina, licencia: c.licencia, fuente: c.fuente, momento: c.momento, duracionS: Math.min(20, Math.round(c.duracion_s * 10) / 10) });
  if (fs.existsSync(destino) && fs.statSync(destino).size > 0) { console.log(`ya está: ${archivo}`); continue; }
  if (!fs.existsSync(entrada)) { console.log(`FALTA el original: ${archivo}`); continue; }
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-t', '20', '-i', entrada, '-an',
    '-vf', 'fps=30,scale=1296:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1296:1920,setsar=1,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '27', '-maxrate', '3500k', '-bufsize', '7000k', '-movflags', '+faststart', destino], { stdio: 'inherit' });
  if (r.status !== 0) { console.log(`ERROR con ${archivo}`); continue; }
  hechos += 1;
  console.log(`listo: ${archivo} (${(fs.statSync(destino).size / 1e6).toFixed(1)} MB)`);
}
const manifiesto = {
  _leeme: 'Fondos de video del clima del kit 3.0. Los archivos NO están en el repositorio (stock con licencia Pexels / Mixkit Free): viven en el depósito R2 radar-fotos, en kit3/fondos/. Ver LEEME.md. Se genera con preparar.mjs.',
  carpeta: 'kit3/fondos/',
  formato: '1296x1920 (9:16 con margen de paneo), 30 cuadros, hasta 20 s, H.264, sin audio',
  estados,
};
fs.writeFileSync(path.join(salida, 'fondos.json'), `${JSON.stringify(manifiesto, null, 2)}\n`);
console.log(`${hechos} clips nuevos; manifiesto en ${path.join(salida, 'fondos.json')}`);
