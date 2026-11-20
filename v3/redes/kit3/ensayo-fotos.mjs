// Ensayo MUDO de la regla de las imágenes completas (20/11/2026; ver REGLAS.md): dibuja las plantillas que usan foto con imágenes de FORMAS y tipos distintos (flyers y placas, fotos 16:9, verticales, con cielo liso, cuadradas)
// para mirar que un gráfico con texto se lea entero y que una foto cubra la caja. Sin voz, sin IA, sin red, sin publicar. Cada decisión (cubre / foto entera y por qué) queda en el log, como en la pieza.
//
//   node v3/redes/kit3/ensayo-fotos.mjs --fotos D:\\ruta\\fuentes --salida D:\\ruta\\salida [solo-tapas]
//
// En --fotos van los .jpg o .png (el nombre, sin el número y la extensión, es el titular de prueba: «01-flyer-zoonosis.jpg»). Deja, por cada imagen, la tapa de un repaso que la tiene de primera (y su recorte de la grilla)
// y repasos completos con las imágenes de a tres, en orden. Con `solo-tapas` sólo las tapas.
import fs from 'node:fs';
import path from 'node:path';
import { armarRepaso } from '../piezas/armadores.mjs';
import { resolverFotos } from '../piezas/fotos.mjs';
import { dibujarConKit3 } from './kit3.mjs';

async function main() {
  const args = process.argv.slice(2);
  const valor = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
  const fotos = path.resolve(valor('--fotos') ?? 'fotos');
  const salida = path.resolve(valor('--salida') ?? 'salida-fotos');
  const soloTapas = args.includes('solo-tapas');
  fs.mkdirSync(salida, { recursive: true });
  const env = { ...process.env, KIT3_FONDOS: '', KIT3_GRAFICOS: '' };
  const { colorDeSeccion } = await import('../../../reels/placa.mjs');
  const archivos = fs.readdirSync(fotos).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort();
  if (archivos.length < 3) throw new Error('hacen falta al menos 3 imágenes en --fotos');
  const claveDe = (f) => f.replace(/\.[a-z]+$/i, '');
  const titulo = (f) => claveDe(f).replace(/^\d+[-_]?/, '').replace(/[-_]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
  const nota = (f, k) => ({
    id: `${claveDe(f)}-${k}`, titulo: titulo(f), bajada: 'Ensayo de la regla de las imágenes completas.', cuerpo: ['Primer párrafo de prueba de la nota.', 'Segundo párrafo de prueba de la nota.', 'Tercer párrafo de prueba de la nota.'],
    seccion: 'Balcarce', firma: 'Redacción Radar Balcarce', deBalcarce: k === 0, foto: { ruta: path.join(fotos, f), credito: 'Foto: ensayo' }, fotos: [{ ruta: path.join(fotos, f), credito: 'Foto: ensayo' }],
  });
  const ahora = { fecha: 'Viernes 20 de noviembre', hora: 14, primeraDelBloque: false };
  const repaso = (lista, momento) => () => armarRepaso(lista.map((f, k) => nota(f, k)), { ...ahora, momento });
  const piezas = {};
  for (const f of archivos) piezas[`tapa-${claveDe(f)}`] = { arma: repaso([f, ...archivos.filter((x) => x !== f).slice(0, 2)], 'tarde'), soloTapa: true };
  if (!soloTapas) for (let i = 0; i < archivos.length; i += 3) piezas[`repaso-${i / 3 + 1}`] = { arma: repaso(archivos.slice(i, i + 3).concat(archivos).slice(0, 3), ['manana', 'tarde', 'noche'][(i / 3) % 3]) };
  for (const [id, p] of Object.entries(piezas)) {
    try {
      const pieza = await resolverFotos(p.arma());
      const r = await dibujarConKit3(pieza, path.join(salida, `${id}.mp4`), { env, soloTapa: !!p.soloTapa, colorDeSeccion, log: (t) => console.log(`  ${t}`) });
      console.log(`${id}: listo (${Math.round(r.ms / 1000)} s)`);
      for (const a of r.avisos ?? []) if (/^foto /.test(a)) console.log(`    ${a}`);
    } catch (e) { console.log(`${id}: FALLÓ · ${String(e?.stack ?? e).slice(0, 500)}`); process.exitCode = 1; }
  }
}

const esElPrograma = process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(path.resolve(process.argv[1])).href;
if (esElPrograma) main().catch((e) => { console.error(e.stack || e); process.exit(1); });
