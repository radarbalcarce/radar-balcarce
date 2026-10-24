// PROTOTIPO (24/10/2026, docs/proyecto/SITIO-POR-WORKER-PLAN.md): el cargador que deja correr los componentes de web/ en Node pelado,
// sin compilar el sitio con Next. No toca nada de web/: sólo cambia cómo se leen sus archivos al importarlos.
//
//   · "@/lib/x"                       → web/lib/x.js (el alias de jsconfig.json).
//   · los archivos .js de web/ con JSX → se transforman al vuelo (SWC, el compilador que trae Next; en el Worker de verdad lo hace esbuild
//                                       de wrangler, que lee JSX en .js).
//   · "react", "react/jsx-runtime"    → el React 19 que trae Next adentro (`next/dist/compiled/react`): es el que arma hoy las páginas del
//                                       sitio (el App Router ignora el "react": "^18" de web/package.json). Usar el mismo da el mismo HTML.
//   · "next/navigation", "next/og"    → piezas mínimas (cargador/sustitutos/): `notFound` y `usePathname`; `next/og` no se usa en una nota.
//   · "./globals.css"                 → vacío (el CSS lo sirve el sitio como archivo aparte).
//
// Se registra con `register('.../hooks.mjs', import.meta.url)` (node:module) ANTES de importar nada de web/.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const AQUI = import.meta.dirname;
const RAIZ = path.resolve(AQUI, '..', '..', '..');
const WEB = path.join(RAIZ, 'web');
const SUSTITUTOS = path.join(AQUI, 'sustitutos');
const COMPILADO = path.join(WEB, 'node_modules', 'next', 'dist', 'compiled');

const aUrl = (ruta) => pathToFileURL(ruta).href;

/** A qué archivo va cada módulo "de afuera" que el sitio importa. */
const REEMPLAZOS = {
  react: path.join(COMPILADO, 'react', 'index.js'),
  'react/jsx-runtime': path.join(COMPILADO, 'react', 'jsx-runtime.js'),
  'react/jsx-dev-runtime': path.join(COMPILADO, 'react', 'jsx-dev-runtime.js'),
  'react-dom': path.join(COMPILADO, 'react-dom', 'index.js'),
  // La versión "edge" es la que corre en un Worker (renderToReadableStream, sin módulos de Node).
  'react-dom/server': path.join(COMPILADO, 'react-dom', 'server.edge.js'),
  'next/navigation': path.join(SUSTITUTOS, 'navegacion.mjs'),
  'next/og': path.join(SUSTITUTOS, 'og.mjs'),
};

const CANDIDATOS = ['', '.js', '.mjs', '/index.js'];

export function resolve(especificador, contexto, siguiente) {
  if (REEMPLAZOS[especificador]) return { url: aUrl(REEMPLAZOS[especificador]), shortCircuit: true, format: REEMPLAZOS[especificador].endsWith('.mjs') ? 'module' : 'commonjs' };
  if (especificador.startsWith('@/')) {
    const base = path.join(WEB, especificador.slice(2));
    for (const ext of CANDIDATOS) {
      const archivo = `${base}${ext}`;
      if (fs.existsSync(archivo) && fs.statSync(archivo).isFile()) return { url: aUrl(archivo), shortCircuit: true, format: 'module' };
    }
  }
  // Los imports relativos sin extensión ("./clima-vivo"): webpack los completa, Node no.
  if (especificador.startsWith('.') && contexto.parentURL?.startsWith('file:') && !path.extname(especificador)) {
    const base = path.resolve(path.dirname(fileURLToPath(contexto.parentURL)), especificador);
    if (base.startsWith(WEB + path.sep)) {
      for (const ext of ['.js', '/index.js']) {
        const archivo = `${base}${ext}`;
        if (fs.existsSync(archivo) && fs.statSync(archivo).isFile()) return { url: aUrl(archivo), shortCircuit: true, format: 'module' };
      }
    }
  }
  return siguiente(especificador, contexto);
}

let transformar = null;
function cargarSwc() {
  if (transformar) return transformar;
  const requerir = createRequire(path.join(WEB, 'package.json'));
  const swc = requerir('next/dist/build/swc');
  transformar = (codigo, archivo) => swc.transform(codigo, {
    filename: archivo,
    jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic', development: false } }, target: 'es2022' },
    module: { type: 'es6' },
    sourceMaps: false,
  }).then((r) => r.code);
  return transformar;
}

export async function load(url, contexto, siguiente) {
  if (url.endsWith('.css')) return { format: 'module', source: 'export default {};', shortCircuit: true };
  if (url.startsWith('file:')) {
    const archivo = fileURLToPath(url);
    const dentroDeWeb = archivo.startsWith(WEB + path.sep) && !archivo.includes(`${path.sep}node_modules${path.sep}`);
    // `import avisos from '../data/avisos.json'` (webpack lo acepta sin más; Node pide el atributo `with { type: 'json' }`): se lee como módulo.
    if (dentroDeWeb && archivo.endsWith('.json')) {
      return { format: 'module', source: `export default ${fs.readFileSync(archivo, 'utf8')};`, shortCircuit: true };
    }
    if (dentroDeWeb && archivo.endsWith('.js')) {
      const codigo = await cargarSwc()(fs.readFileSync(archivo, 'utf8'), archivo);
      return { format: 'module', source: codigo, shortCircuit: true };
    }
  }
  return siguiente(url, contexto);
}
