// Baja del depósito R2 `radar-fotos` (carpeta `kit3/fondos/`) los clips de video del clima del kit 3.0 a una carpeta local, la que después se pasa como `KIT3_FONDOS`.
// Los clips no están en el repositorio (stock con licencia, pesan unos 170 MB): se suben una vez a R2 (ver LEEME.md) y un workflow los baja con esto antes de dibujar.
//
//   node v3/redes/kit3/fondos/bajar.mjs <carpeta de destino>
//   (usa R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY y CLOUDFLARE_ACCOUNT_ID, los mismos secretos que ya usa «Radar 3.0: piezas»; KIT3_BUCKET cambia el depósito, por defecto radar-fotos)
//
// Sólo baja lo que dice `fondos.json` y no baja de nuevo lo que ya está con el mismo tamaño. Sin claves o sin red, falla con un mensaje claro: quien lo llama sigue sin fondos (cielo gráfico).
import fs from 'node:fs';
import path from 'node:path';
import { clienteR2 } from '../../../../infra/compartido/r2-s3.mjs';

const AQUI = import.meta.dirname;

/** Los archivos que hay que tener (rutas relativas, con la barra de adelante) según el manifiesto. */
export const archivosDelManifiesto = (man) => [...new Set(Object.values(man.estados).flat().map((c) => c.archivo))];

/** Baja lo que falta. Devuelve { bajados, yaEstaban, faltan }. `cliente` se puede reemplazar para probar sin red. */
export async function bajarFondos(destino, { cliente, prefijo = 'kit3/fondos/', manifiesto = JSON.parse(fs.readFileSync(path.join(AQUI, 'fondos.json'), 'utf8')), log = () => {} } = {}) {
  const r = { bajados: 0, yaEstaban: 0, faltan: [] };
  for (const archivo of archivosDelManifiesto(manifiesto)) {
    const salida = path.join(destino, archivo);
    const bytes = await cliente.leer(`${prefijo}${archivo}`);
    if (!bytes) { r.faltan.push(archivo); log(`falta en R2: ${archivo}`); continue; }
    if (fs.existsSync(salida) && fs.statSync(salida).size === bytes.length) { r.yaEstaban += 1; continue; }
    fs.mkdirSync(path.dirname(salida), { recursive: true });
    fs.writeFileSync(salida, bytes);
    r.bajados += 1;
  }
  return r;
}

const esElPrograma = process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(path.resolve(process.argv[1])).href;
if (esElPrograma) {
  const destino = process.argv[2];
  if (!destino) { console.error('uso: node bajar.mjs <carpeta de destino>'); process.exit(1); }
  const cliente = clienteR2({ cuenta: process.env.CLOUDFLARE_ACCOUNT_ID, bucket: process.env.KIT3_BUCKET || 'radar-fotos', accessKey: process.env.R2_ACCESS_KEY_ID, secretKey: process.env.R2_SECRET_ACCESS_KEY });
  const r = await bajarFondos(destino, { cliente, log: console.log });
  console.log(`fondos del kit 3.0: ${r.bajados} bajados, ${r.yaEstaban} ya estaban, ${r.faltan.length} faltan en R2`);
  if (r.faltan.length) process.exitCode = 1;
}
