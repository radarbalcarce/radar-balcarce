// Arma la carpeta de un proyecto de HyperFrames (HTML + GSAP) para una pieza del kit 3.0: copia el kit (estilos, motor de animación, tipografías libres del repositorio), la plantilla de la pieza,
// las fotos ya bajadas y, si hay, el fondo de video del clima. No dibuja nada (eso lo hace `kit3.mjs` con `hyperframes render`). Sin red.
import fs from 'node:fs';
import path from 'node:path';
import { T0 } from './variables.mjs';

export const AQUI = import.meta.dirname;
const RAIZ = path.join(AQUI, '..', '..', '..');
export const PLANTILLAS = ['clima', 'repaso', 'efemeride', 'farmacias', 'nota'];

/** El JSON de la pieza para meterlo en un <script>: sin `</script>` ni separadores de línea raros. */
const BS = String.fromCharCode(92);
export const jsonSeguro = (o) => JSON.stringify(o).replace(/</g, `${BS}u003c`).replace(new RegExp(String.fromCharCode(0x2028), 'g'), `${BS}u2028`).replace(new RegExp(String.fromCharCode(0x2029), 'g'), `${BS}u2029`);

/** Lo que lee el kit (`Radar.run`) de la pieza: tiempos, rótulo, colores, palabras con su cartel y los datos de la plantilla. */
export function especificacion(pieza, { video = null, tapaFondo = false } = {}) {
  return {
    id: pieza.id, dur: pieza.dur, T0, kit: pieza.kit ?? 'k1', video, hl: pieza.hl, subs: pieza.subs, rotulo: pieza.rotulo ?? null, scrim: pieza.scrim, subsTop: pieza.subsTop ?? null, palabras: pieza.palabras,
    datos: pieza.datos, marcaTapa: pieza.marcaTapa !== false, marcaClara: !!pieza.marcaClara, tapaFondo,
  };
}

/** El index.html del proyecto (la tapa es la capa que cubre los primeros 0,8 s: el kit la dibuja con `tapa(K, S)` de la plantilla). */
export function htmlDelProyecto(spec, { escenas, css, kit }) {
  return `<!doctype html><html lang="es"><head><meta charset="UTF-8"/><meta name="viewport" content="width=1080, height=1920"/>
<script src="gsap.min.js"></script><style>${css}</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${Number((spec.dur + spec.T0).toFixed(2))}" data-width="1080" data-height="1920"></div>
<script>${kit}</script>
<script>const SPEC=${jsonSeguro(spec)};${escenas}
Radar.run(SPEC, escenas, typeof tapa === 'function' ? tapa : null);</script></body></html>`;
}

const dePlantilla = (nombre) => {
  if (!PLANTILLAS.includes(nombre)) throw new Error(`no hay plantilla «${nombre}» en el kit 3.0`);
  return fs.readFileSync(path.join(AQUI, 'plantillas', `${nombre}.js`), 'utf8');
};

/**
 * Escribe el proyecto en `dir`. `pieza` es lo que devuelve `desdePieza`; `fondoMp4` (ruta) y `tapaFondoJpg` (ruta) vienen de `fondo.mjs` si había clips del cielo.
 * Devuelve { dir, html }. Tira un error claro si faltan las dependencias (`npm ci` dentro de `v3/redes/kit3`).
 */
export function escribirProyecto(pieza, dir, { fondoMp4 = null, tapaFondoJpg = null } = {}) {
  const gsap = path.join(AQUI, 'node_modules', 'gsap', 'dist', 'gsap.min.js');
  if (!fs.existsSync(gsap)) throw new Error('kit 3.0: faltan las dependencias (correr «npm ci» dentro de v3/redes/kit3)');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'fotos'), { recursive: true });
  fs.cpSync(path.join(RAIZ, 'reels', 'marca', 'fuentes'), path.join(dir, 'fonts'), { recursive: true });
  fs.copyFileSync(gsap, path.join(dir, 'gsap.min.js'));
  fs.copyFileSync(path.join(AQUI, 'kit', 'hyperframes.json'), path.join(dir, 'hyperframes.json'));
  for (const f of pieza.fotos ?? []) {
    const m = String(f.datos).match(/^data:image\/[a-z+]+;base64,(.*)$/s);
    if (!m) throw new Error(`la foto ${f.clave} no viene como data URI`);
    fs.writeFileSync(path.join(dir, 'fotos', `${f.clave}.${f.ext}`), Buffer.from(m[1], 'base64'));
  }
  if (fondoMp4) fs.copyFileSync(fondoMp4, path.join(dir, 'fondo.mp4'));
  if (tapaFondoJpg) fs.copyFileSync(tapaFondoJpg, path.join(dir, 'fotos', 'tapa-fondo.jpg'));
  const spec = especificacion(pieza, { video: fondoMp4 ? 'fondo.mp4' : null, tapaFondo: !!tapaFondoJpg });
  const html = htmlDelProyecto(spec, {
    escenas: dePlantilla(pieza.plantilla),
    css: fs.readFileSync(path.join(AQUI, 'kit', 'kit.css'), 'utf8'),
    kit: fs.readFileSync(path.join(AQUI, 'kit', 'kit.js'), 'utf8'),
  });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  return { dir, html };
}
