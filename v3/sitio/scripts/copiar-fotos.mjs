// Copia las fotos (y las tipografías) del sitio viejo al depósito R2 `radar-fotos`, que el Worker `radar-sitio` sirve en /fotos-notas/* y /fuentes/*.
//   node v3/sitio/scripts/copiar-fotos.mjs [--forzar] [--sin-archivo] [--simular]
// Necesita CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID. Qué copia:
//   1. web/public/fotos-notas/**  → fotos-notas/<archivo>   (las que el repositorio tiene: ~1.450, 124 MB)
//   2. web/public/fuentes/**      → fuentes/<archivo>       (las tipografías que cargan las páginas)
//   3. las fotos que piden las notas migradas (portada, archivo, histórico, redacción) y que el repositorio NO tiene: se buscan en el depósito viejo
//      `radar-archivo` (clave fotos-notas/<archivo>, donde las dejó el exportador del archivo permanente) y se pasan al nuevo. (--sin-archivo lo omite.)
// Salta lo que ya está en `radar-fotos` (lo lista por la API REST; si la API no contesta, sube todo: `put` pisa con lo mismo). --forzar sube todo igual.
// --simular no sube nada: cuenta. Termina con código 0 aunque falten algunas fotos (las cuenta); código 1 sólo si no hay credenciales o falla el depósito.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { archivosDeFotosViejas, tipoDeArchivo } from './archivo-viejo.mjs';
import { correrWrangler, hayCredenciales, listarClaves, enParalelo } from './wrangler.mjs';

const aca = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aca, '../../..');
const datos = path.join(raiz, 'web', 'data');
const publico = path.join(raiz, 'web', 'public');
export const DEPOSITO_NUEVO = 'radar-fotos';
export const DEPOSITO_VIEJO = 'radar-archivo';
const NOMBRE_VALIDO = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/;

const leer = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);

function archivosDe(carpeta) {
  if (!fs.existsSync(carpeta)) return [];
  return fs.readdirSync(carpeta, { withFileTypes: true }).filter((e) => e.isFile() && NOMBRE_VALIDO.test(e.name)).map((e) => e.name);
}

/** Todas las fotos que piden las notas viejas (para encontrar las que el repositorio no tiene). */
export function fotosPedidasPorLasNotas() {
  const pedidas = new Set();
  const sumar = (lista) => { for (const n of lista ?? []) for (const a of archivosDeFotosViejas(n)) pedidas.add(a); };
  for (const f of ['portada.json', 'archivo.json']) sumar(leer(path.join(datos, f))?.notas);
  const carpeta = path.join(datos, 'historico');
  if (fs.existsSync(carpeta)) for (const f of fs.readdirSync(carpeta)) if (/^\d{4}-\d{2}\.json$/.test(f)) sumar(leer(path.join(carpeta, f))?.notas);
  // Las de la redacción: sus fotos están en web/public/fotos-notas/redaccion-* (ya entran por el punto 1).
  return pedidas;
}

async function main() {
  const args = process.argv.slice(2);
  const forzar = args.includes('--forzar');
  const simular = args.includes('--simular');
  const sinArchivo = args.includes('--sin-archivo');
  if (!hayCredenciales() && !simular) { console.error('Faltan CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID.'); process.exit(1); }

  const enRepo = [
    ...archivosDe(path.join(publico, 'fotos-notas')).map((a) => ({ clave: `fotos-notas/${a}`, origen: path.join(publico, 'fotos-notas', a) })),
    ...archivosDe(path.join(publico, 'fuentes')).map((a) => ({ clave: `fuentes/${a}`, origen: path.join(publico, 'fuentes', a) })),
  ];
  const tiene = new Set(enRepo.map((x) => x.clave));
  const faltan = [...fotosPedidasPorLasNotas()].map((a) => `fotos-notas/${a}`).filter((c) => !tiene.has(c));
  console.log(`En el repositorio: ${enRepo.length} archivos (fotos y tipografías). Fotos que piden las notas y el repositorio no tiene: ${faltan.length}.`);

  let yaEstan = new Set();
  if (!forzar && !simular) {
    const listado = await listarClaves(DEPOSITO_NUEVO);
    if (listado) { yaEstan = listado; console.log(`${DEPOSITO_NUEVO} ya tiene ${listado.size} objetos: se saltan.`); } else console.log('No se pudo listar el depósito por la API: se sube todo (es seguro, pisa con lo mismo).');
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fotos-'));
  let subidas = 0; let saltadas = 0; let fallidas = 0; let rescatadas = 0; let sinOrigen = 0;
  const subir = async (clave, archivo) => {
    const r = await correrWrangler(['r2', 'object', 'put', `${DEPOSITO_NUEVO}/${clave}`, '--file', archivo, '--content-type', tipoDeArchivo(clave), '--cache-control', 'public, max-age=31536000', '--remote']);
    if (r.ok) return true;
    console.log(`  ! no se pudo subir ${clave}: ${r.salida.split('\n').slice(-2).join(' ').trim()}`);
    return false;
  };

  await enParalelo(enRepo.map((x) => async () => {
    if (yaEstan.has(x.clave)) { saltadas += 1; return; }
    if (simular) { subidas += 1; return; }
    if (await subir(x.clave, x.origen)) subidas += 1; else fallidas += 1;
  }), 6);

  if (!sinArchivo) {
    await enParalelo(faltan.map((clave) => async () => {
      if (yaEstan.has(clave)) { saltadas += 1; return; }
      if (simular) { sinOrigen += 1; return; }
      const destino = path.join(tmp, clave.replace(/[^A-Za-z0-9.-]/g, '_'));
      const g = await correrWrangler(['r2', 'object', 'get', `${DEPOSITO_VIEJO}/${clave}`, '--file', destino, '--remote']);
      if (!g.ok || !fs.existsSync(destino)) { sinOrigen += 1; return; }
      if (await subir(clave, destino)) rescatadas += 1; else fallidas += 1;
      fs.rmSync(destino, { force: true });
    }), 6);
  } else sinOrigen = faltan.length;
  fs.rmSync(tmp, { recursive: true, force: true });

  console.log(`${simular ? 'Se subirían' : 'Subidas'}: ${subidas}. Ya estaban: ${saltadas}. Rescatadas del depósito viejo: ${rescatadas}. Fotos pedidas que no están en ningún lado: ${sinOrigen}. Fallidas: ${fallidas}.`);
  if (fallidas) console.log('Hubo fallas: correr de nuevo (salta lo ya subido).');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
