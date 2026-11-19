// Sube a R2 (`radar-fotos`, carpeta `kit3/fondos/`) los clips de video del clima ya preparados con preparar.mjs. Se corre UNA vez, a mano, y los baja después `bajar.mjs`.
//
//   node v3/redes/kit3/fondos/subir.mjs D:\BalcarDev\RadarMedia\fondos-clima-kit3          (sube lo que falta o cambió de tamaño)
//   node v3/redes/kit3/fondos/subir.mjs D:\BalcarDev\RadarMedia\fondos-clima-kit3 --probar  (sólo cuenta, no sube)
//
// Necesita R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY y CLOUDFLARE_ACCOUNT_ID (los de «Radar 3.0: piezas»; los pega una persona en su terminal, nunca en un chat ni en el código).
// Sólo sube los archivos que dice `fondos.json` (el del repositorio) y no repite lo que ya está con el mismo tamaño.
import fs from 'node:fs';
import path from 'node:path';
import { clienteR2 } from '../../../../infra/compartido/r2-s3.mjs';
import { archivosDelManifiesto } from './bajar.mjs';

const AQUI = import.meta.dirname;

export async function subirFondos(origen, { cliente, prefijo = 'kit3/fondos/', manifiesto = JSON.parse(fs.readFileSync(path.join(AQUI, 'fondos.json'), 'utf8')), probar = false, log = () => {} } = {}) {
  const r = { subidos: 0, yaEstaban: 0, faltanLocal: [] };
  for (const archivo of archivosDelManifiesto(manifiesto)) {
    const ruta = path.join(origen, archivo);
    if (!fs.existsSync(ruta)) { r.faltanLocal.push(archivo); log(`falta en la carpeta local: ${archivo}`); continue; }
    const bytes = fs.readFileSync(ruta);
    const actual = probar ? null : await cliente.leer(`${prefijo}${archivo}`);
    if (actual && actual.length === bytes.length) { r.yaEstaban += 1; continue; }
    if (!probar) await cliente.guardar(`${prefijo}${archivo}`, bytes, 'video/mp4');
    r.subidos += 1;
    log(`${probar ? 'subiría' : 'subido'}: ${archivo} (${(bytes.length / 1e6).toFixed(1)} MB)`);
  }
  return r;
}

const esElPrograma = process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(path.resolve(process.argv[1])).href;
if (esElPrograma) {
  const [origen, ...resto] = process.argv.slice(2);
  const probar = resto.includes('--probar');
  if (!origen) { console.error('uso: node subir.mjs <carpeta preparada> [--probar]'); process.exit(1); }
  const { CLOUDFLARE_ACCOUNT_ID: cuenta, R2_ACCESS_KEY_ID: accessKey, R2_SECRET_ACCESS_KEY: secretKey } = process.env;
  if (!probar && !(cuenta && accessKey && secretKey)) { console.error('faltan CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY en el entorno'); process.exit(1); }
  const cliente = probar ? null : clienteR2({ cuenta, bucket: process.env.KIT3_BUCKET || 'radar-fotos', accessKey, secretKey });
  const r = await subirFondos(origen, { cliente, probar, log: console.log });
  console.log(`fondos del kit 3.0: ${r.subidos} ${probar ? 'por subir' : 'subidos'}, ${r.yaEstaban} ya estaban, ${r.faltanLocal.length} faltan en la carpeta local`);
  if (r.faltanLocal.length) process.exitCode = 1;
}
