// Arma la carpeta de un proyecto de HyperFrames (HTML + GSAP) para una pieza del kit 3.0: copia el kit (estilos, motor de animación, tipografías libres del repositorio), la plantilla de la pieza,
// las fotos ya bajadas y, si hay, el fondo de video del clima. No dibuja nada (eso lo hace `kit3.mjs` con `hyperframes render`). Sin red.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { T0 } from './variables.mjs';
import { rellenoDeFoto } from './relleno.mjs';

export const AQUI = import.meta.dirname;
let _radar;
/** El motor del kit (kit/kit.js) cargado en Node con un `window` falso, para usar su geometría pura (`encuadre`). */
export function motorDelKit() {
  if (!_radar) { const v = {}; new Function('window', fs.readFileSync(path.join(AQUI, 'kit', 'kit.js'), 'utf8'))(v); _radar = v.Radar; }
  return _radar;
}

/** Qué se hizo con cada imagen y por qué (para el log de la pieza): «foto entera: parece un gráfico con texto», «foto entera: cubrirla recortaría más de 22 % por costado» o «foto cubriendo la caja». */
export function decisionesDeFotos(fotos, rellenos, alto = 980) {
  const { encuadre } = motorDelKit();
  return (fotos ?? []).map((f) => {
    const r = rellenos[`fotos/${f.clave}.${f.ext}`] ?? null;
    const e = encuadre(f.ancho, f.alto, 1080, alto, f.alto > f.ancho ? 0.15 : 0.35, null, !!r?.grafico);
    const dato = r ? ` (dominantes ${r.dominantes}, planos ${r.planos}, bordes ${r.bordes})` : '';
    if (e.modo === 'cobertura') return `foto ${f.clave}: cubre la caja${r?.grafico ? ' (parece un gráfico pero el recorte es chico)' : ''}${dato}`;
    return `foto ${f.clave}: foto entera: ${e.motivo === 'grafico' ? 'parece un gráfico con texto' : 'cubrirla recortaría más del 22 % por costado'}${dato}`;
  });
}
const RAIZ = path.join(AQUI, '..', '..', '..');
export const PLANTILLAS = ['clima', 'repaso', 'efemeride', 'farmacias', 'nota', 'numero', 'participa'];

let _ffmpeg;
/** El ffmpeg del repositorio (`ffmpeg-static`) o el del sistema. */
function ffmpegDelRepo() {
  if (_ffmpeg === undefined) { try { _ffmpeg = createRequire(import.meta.url)('ffmpeg-static') || 'ffmpeg'; } catch { _ffmpeg = 'ffmpeg'; } }
  return _ffmpeg;
}

/** Copia de los datos de la pieza donde cada foto ({ src: 'fotos/…', w, h }) trae `relleno` ({ lados, arriba }): el color liso que rellena el espacio que sobra cuando va entera. */
export function conRellenos(datos, rellenos) {
  const ir = (v) => {
    if (Array.isArray(v)) return v.map(ir);
    if (v && typeof v === 'object') {
      const o = {};
      for (const [k, x] of Object.entries(v)) o[k] = ir(x);
      if (typeof o.src === 'string' && rellenos[o.src]) o.relleno = rellenos[o.src];
      return o;
    }
    return v;
  };
  return ir(datos);
}

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
export function htmlDelProyecto(spec, { escenas, css, kit, datos = '' }) {
  return `<!doctype html><html lang="es"><head><meta charset="UTF-8"/><meta name="viewport" content="width=1080, height=1920"/>
<script src="gsap.min.js"></script><style>${css}</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${Number((spec.dur + spec.T0).toFixed(2))}" data-width="1080" data-height="1920"></div>
<script>${kit}</script>
<script>${datos}</script>
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
  const rellenos = {};
  for (const f of pieza.fotos ?? []) {
    const m = String(f.datos).match(/^data:image\/[a-z+]+;base64,(.*)$/s);
    if (!m) throw new Error(`la foto ${f.clave} no viene como data URI`);
    const bytes = Buffer.from(m[1], 'base64');
    fs.writeFileSync(path.join(dir, 'fotos', `${f.clave}.${f.ext}`), bytes);
    rellenos[`fotos/${f.clave}.${f.ext}`] = rellenoDeFoto(bytes, ffmpegDelRepo()); // color liso de los bordes: rellena el espacio cuando la foto va entera
  }
  pieza = { ...pieza, datos: conRellenos(pieza.datos, rellenos) };
  if (Array.isArray(pieza.avisos)) pieza.avisos.push(...decisionesDeFotos(pieza.fotos, rellenos, pieza.plantilla === 'efemeride' ? 880 : 980)); // el mismo arreglo que ve el informe de la pieza
  if (pieza.plantilla === 'participa') for (const f of fs.readdirSync(path.join(AQUI, 'fotos-participa'))) fs.copyFileSync(path.join(AQUI, 'fotos-participa', f), path.join(dir, 'fotos', f)); // las fotos fijas de «¿Viste algo?»
  if (fondoMp4) fs.copyFileSync(fondoMp4, path.join(dir, 'fondo.mp4'));
  if (tapaFondoJpg) fs.copyFileSync(tapaFondoJpg, path.join(dir, 'fotos', 'tapa-fondo.jpg'));
  const spec = especificacion(pieza, { video: fondoMp4 ? 'fondo.mp4' : null, tapaFondo: !!tapaFondoJpg });
  const html = htmlDelProyecto(spec, {
    escenas: dePlantilla(pieza.plantilla),
    css: fs.readFileSync(path.join(AQUI, 'kit', 'kit.css'), 'utf8'),
    kit: fs.readFileSync(path.join(AQUI, 'kit', 'kit.js'), 'utf8'),
    datos: fs.readFileSync(path.join(AQUI, 'kit', 'datos.js'), 'utf8'),
  });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  return { dir, html };
}
