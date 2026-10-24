// ¿Hace falta compilar y subir el sitio en esta vuelta? (23/10/2026, regla 304)
//
//   node web/scripts/huella-del-sitio.mjs comparar    dice `igual=true|false` (en $GITHUB_OUTPUT si existe)
//   node web/scripts/huella-del-sitio.mjs escribir    deja web/out/huella-del-sitio.txt con la huella de lo que se va a subir
//
// Cada vuelta compilaba el sitio entero (~2,5 minutos) y lo subía, aunque lo que lee la compilación fuera idéntico a lo que ya estaba
// publicado (una madrugada tranquila, una vuelta que sólo movió contadores internos). Acá se calcula la HUELLA DE LO QUE LEE LA COMPILACIÓN:
//   - los archivos de web/data/ que el sitio lee (todos menos los de NO_CAMBIAN_EL_SITIO de recompilar.mjs: fichas, vistas, estadísticas…),
//   - el código (web/app, lib, components, scripts, public; ingesta/, redes/ y las tipografías), con las fotos por nombre y tamaño,
//   - las variables que cambian el sitio (SITIO, FOTOS_BASE, los canales, TOPE_DE_NOTAS…),
//   - y una franja de HORAS_ENTRE_COMPILACIONES horas, porque la compilación también depende del reloj (la ventana de 36 horas de la portada,
//     "próximos eventos", el día de "hoy"): como mucho, el sitio queda 3 horas sin recompilarse, nunca más.
// La huella de lo ya publicado está en el propio sitio (/huella-del-sitio.txt, la deja el paso `escribir` antes de subir): no hay otro
// estado que se pueda desincronizar. Si no se puede leer, o es distinta, se compila (ante la duda, compila, como en recompilar.mjs).
// `COMPILAR_SIEMPRE=Si` (variable de GitHub) fuerza la compilación de siempre.
//
// Sin dependencias: sólo lo que trae Node.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { NO_CAMBIAN_EL_SITIO } from './recompilar.mjs';

export const ARCHIVO_DE_LA_HUELLA = 'huella-del-sitio.txt';
/** Cada cuántas horas, como mínimo, se compila aunque nada haya cambiado (el reloj también mueve el sitio). */
export const HORAS_ENTRE_COMPILACIONES = 3;
/** Las variables que cambian lo que sale de la compilación (las lee web/lib; una prueba controla que estén todas). */
export const VARIABLES_DEL_SITIO = [
  'SITIO', 'FOTOS_BASE', 'TOPE_DE_NOTAS', 'R2_ARCHIVO', 'SITEMAP_DEL_ARCHIVO', 'WHATSAPP_CANAL_URL', 'TELEGRAM_CANAL_URL', 'BLUESKY_URL',
];
/** Lo que la propia vuelta escribe en web/public/ y que no es del sitio de verdad (se rehace en cada vuelta). */
const GENERADOS_EN_PUBLIC = [/^web\/public\/_redirects$/, /^web\/public\/panel\/estadistica-seleccion\.html$/];
/**
 * Los archivos de web/data/ que SOLO lee el armado de los datos (generar-datos), no la compilación: ninguna página los toca. Una prueba
 * (pruebas/menos-compilaciones.test.mjs) controla que ningún archivo de web/lib, web/app o web/components nombre alguno. Más estricta que
 * NO_CAMBIAN_EL_SITIO (que también deja afuera lo que escriben otros workflows): acá lo dudoso cuenta como entrada.
 */
export const SOLO_PARA_ARMAR_LOS_DATOS = [
  /^web\/data\/(fichas|vistas|muy-contadas|estadistica-seleccion|esperando-cuerpo|notas-por-dia|fotos-ia|fotos-manuales|feriados-piezas)\.json$/,
  /^web\/data\/celular-[a-z]+\.json$/,
  /^web\/data\/efemerides-(candidatas|elegidas)\.json$/,
];
/** Carpetas de código que la compilación lee (y de las que nada se hornea con el reloj). */
const CARPETAS = ['web/app', 'web/lib', 'web/components', 'web/scripts', 'web/public', 'ingesta', 'redes', 'reels/marca/fuentes'];
const ARCHIVOS = ['package.json', 'package-lock.json', 'web/package.json', 'web/package-lock.json', 'web/next.config.mjs', 'web/jsconfig.json'];
const IGNORAR = new Set(['node_modules', '.next', 'out', 'salida', '.git', '.cache', '.DS_Store']);
/** Las fotos y los escudos son muchos y pesados: cuentan por nombre y tamaño (el banco, que sí se hashea, dice cuál es cuál). */
const POR_NOMBRE_Y_TAMANO = [/^web\/public\/fotos-notas\//, /^web\/public\/escudos\//];

const sha = (x) => crypto.createHash('sha1').update(x).digest('hex');
const alReves = (p) => p.split(path.sep).join('/');

function recorrer(raiz, relativa, salida) {
  let entradas;
  try { entradas = fs.readdirSync(path.join(raiz, relativa), { withFileTypes: true }); } catch { return; }
  entradas.sort((a, b) => (a.name < b.name ? -1 : 1));
  for (const e of entradas) {
    if (IGNORAR.has(e.name)) continue;
    const rel = alReves(path.join(relativa, e.name));
    if (e.isDirectory()) recorrer(raiz, rel, salida);
    else if (e.isFile()) salida.push(rel);
  }
}

/** Los archivos de web/data/ que lee el sitio (los de primer nivel que NO están en NO_CAMBIAN_EL_SITIO). */
export function archivosDeDatosDelSitio(raiz) {
  let nombres = [];
  try { nombres = fs.readdirSync(path.join(raiz, 'web', 'data'), { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name).sort(); } catch { /* sin datos */ }
  // dolar.json lo escribe la propia compilación (scripts/foto-dolar.mjs, no se versiona): no es una entrada.
  return nombres.map((n) => `web/data/${n}`).filter((rel) => rel !== 'web/data/dolar.json' && !NO_CAMBIAN_EL_SITIO.some((r) => r.test(rel)) && !SOLO_PARA_ARMAR_LOS_DATOS.some((r) => r.test(rel)));
}

/**
 * La huella de todo lo que lee la compilación. `ahora` entra sólo por la franja de horas; `env` sólo por las variables del sitio.
 * Es un texto de 40 caracteres.
 */
export function huellaDelSitio({ raiz, env = process.env, ahora = new Date(), horas = HORAS_ENTRE_COMPILACIONES } = {}) {
  const h = crypto.createHash('sha1');
  const poner = (clave, valor) => { h.update(`${clave}\0${valor}\n`); };

  for (const rel of archivosDeDatosDelSitio(raiz)) {
    try { poner(rel, sha(fs.readFileSync(path.join(raiz, rel)))); } catch { poner(rel, 'ilegible'); }
  }
  const codigo = [];
  for (const c of CARPETAS) recorrer(raiz, c, codigo);
  for (const a of ARCHIVOS) if (fs.existsSync(path.join(raiz, a))) codigo.push(a);
  for (const rel of codigo) {
    if (GENERADOS_EN_PUBLIC.some((r) => r.test(rel))) continue;
    try {
      if (POR_NOMBRE_Y_TAMANO.some((r) => r.test(rel))) poner(rel, fs.statSync(path.join(raiz, rel)).size);
      else poner(rel, sha(fs.readFileSync(path.join(raiz, rel))));
    } catch { poner(rel, 'ilegible'); }
  }
  for (const v of VARIABLES_DEL_SITIO) poner(`env:${v}`, String(env?.[v] ?? '').trim());
  poner('franja', Math.floor(ahora.getTime() / (Math.max(1, horas) * 3600 * 1000)));
  return h.digest('hex');
}

/** La huella de lo que está publicado, leída del propio sitio; null si no se pudo (entonces se compila). */
export async function huellaPublicada(sitio, { fetchFn = fetch, ahora = Date.now() } = {}) {
  try {
    const r = await fetchFn(`${String(sitio).replace(/\/$/, '')}/${ARCHIVO_DE_LA_HUELLA}?t=${ahora}`, { headers: { 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) return null;
    const t = String(await r.text()).trim();
    return /^[0-9a-f]{40}$/.test(t) ? t : null;
  } catch {
    return null;
  }
}

/** { compilar, porque }. Sólo se omite cuando la huella de ahora es idéntica a la publicada y nadie forzó la compilación. */
export function decidirSiCompilar({ ahora, publicada, forzar = false }) {
  if (forzar) return { compilar: true, porque: 'COMPILAR_SIEMPRE está prendida' };
  if (!publicada) return { compilar: true, porque: 'no se pudo leer la huella de lo publicado' };
  if (publicada !== ahora) return { compilar: true, porque: 'lo que lee la compilación cambió' };
  return { compilar: false, porque: 'lo que lee la compilación es idéntico a lo publicado' };
}

/** Deja la huella en la carpeta que se sube. */
export function escribirLaHuella(raiz, huella) {
  const destino = path.join(raiz, 'web', 'out', ARCHIVO_DE_LA_HUELLA);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, `${huella}\n`, 'utf8');
  return destino;
}

const si = (v) => /^\s*(si|sí|true|1)\s*$/i.test(String(v ?? ''));

if (process.argv[1] && process.argv[1].endsWith('huella-del-sitio.mjs')) {
  const raiz = path.join(import.meta.dirname, '..', '..');
  const modo = process.argv[2];
  if (modo === 'escribir') {
    const h = huellaDelSitio({ raiz });
    console.log(`Huella del sitio ${h}: ${escribirLaHuella(raiz, h)}`);
  } else {
    let decision = { compilar: true, porque: 'no se pudo calcular la huella' };
    try {
      const ahora = huellaDelSitio({ raiz });
      const publicada = await huellaPublicada(process.env.SITIO || 'https://radarbalcarce.com');
      decision = decidirSiCompilar({ ahora, publicada, forzar: si(process.env.COMPILAR_SIEMPRE) });
    } catch (e) { decision.porque = `no se pudo calcular la huella (${e.message})`; }
    console.log(decision.compilar ? `Se compila: ${decision.porque}.` : `NO se compila ni se sube: ${decision.porque}.`);
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `igual=${!decision.compilar}\n`);
  }
}
