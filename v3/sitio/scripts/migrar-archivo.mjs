// Migra el ARCHIVO PERMANENTE viejo (las notas que ya salieron del sitio, más de las 500 que migra migrar.mjs) a los .sql de la base nueva.
//   node v3/sitio/scripts/migrar-archivo.mjs [--por-archivo=100] [--sin-r2]
// Fuente principal: web/data/historico/AAAA-MM.json (el JSON entero de cada nota que salió del sitio; está en el repositorio).
// Control contra R2: con CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID baja `manifiesto.json` del depósito `radar-archivo` y cuenta cuántas notas tiene;
// las que el manifiesto tiene y ni el histórico ni el sitio conocen se arman leyendo su página (`nota/<id>.html`, notaDesdeHtml). Sin credenciales (o con
// --sin-r2) se migra sólo el histórico y se avisa. Escribe v3/sitio/scripts/salida/archivo-NNN.sql (INSERT OR IGNORE: se puede repetir). NO toca ninguna base.
// Después: `wrangler d1 execute radar-nucleo --remote --file=…` una por una (lo hace el workflow, opción migrar).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generarSql } from './migracion.mjs';
import { idsQueNoSeMigran, juntarHistoricos, idsDelManifiesto, notaDesdeHtml } from './archivo-viejo.mjs';
import { correrWrangler, hayCredenciales, enParalelo } from './wrangler.mjs';

const aca = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aca, '../../..');
const datos = path.join(raiz, 'web', 'data');
const salida = path.join(aca, 'salida');
export const DEPOSITO_VIEJO = 'radar-archivo';

const leer = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);

/** Baja un objeto de R2 a un archivo temporal y devuelve su texto, o null. */
async function bajarTexto(clave, tmp) {
  const destino = path.join(tmp, clave.replace(/[^A-Za-z0-9.-]/g, '_'));
  const r = await correrWrangler(['r2', 'object', 'get', `${DEPOSITO_VIEJO}/${clave}`, '--file', destino, '--remote']);
  if (!r.ok || !fs.existsSync(destino)) return null;
  return fs.readFileSync(destino, 'utf8');
}

async function main() {
  const args = process.argv.slice(2);
  const porArchivo = Number((args.find((a) => a.startsWith('--por-archivo=')) || '=100').split('=')[1]) || 100;
  const usarR2 = !args.includes('--sin-r2') && hayCredenciales();
  if (!usarR2) console.log('Sin R2 (faltan CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID o se pidió --sin-r2): se migra sólo el histórico del repositorio.');

  const excluir = idsQueNoSeMigran({ retiradas: leer(path.join(datos, 'retiradas.json')), revision: leer(path.join(datos, 'revision-archivo.json')) });
  const carpeta = path.join(datos, 'historico');
  const listas = fs.existsSync(carpeta) ? fs.readdirSync(carpeta).filter((f) => /^\d{4}-\d{2}\.json$/.test(f)).sort().reverse().map((f) => leer(path.join(carpeta, f))) : [];
  const notas = juntarHistoricos(listas, { excluir });
  const conocidos = new Set(notas.map((n) => n.id));
  for (const f of ['portada.json', 'archivo.json']) for (const n of leer(path.join(datos, f))?.notas ?? []) conocidos.add(n.id); // ya las migró migrar.mjs
  console.log(`Histórico del repositorio: ${notas.length} notas (sin ${excluir.size} retiradas o unidas a otra).`);

  let delDeposito = 0;
  let rescatadas = 0;
  if (usarR2) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'archivo-viejo-'));
    const texto = await bajarTexto('manifiesto.json', tmp);
    if (!texto) {
      console.log('No se pudo bajar manifiesto.json del depósito radar-archivo: se sigue sólo con el histórico.');
    } else {
      const ids = idsDelManifiesto(JSON.parse(texto));
      delDeposito = ids.length;
      const faltan = ids.filter((id) => !conocidos.has(id) && !excluir.has(id));
      console.log(`El depósito radar-archivo tiene ${ids.length} notas; ${faltan.length} no están ni en el histórico ni en el sitio.`);
      const armadas = await enParalelo(faltan.map((id) => async () => {
        const html = await bajarTexto(`nota/${id}.html`, tmp);
        return html ? notaDesdeHtml(html, id) : null;
      }), 6);
      for (const [i, n] of armadas.entries()) {
        if (n) { notas.push(n); rescatadas += 1; } else console.log(`  - ${faltan[i]}: no se pudo leer su página de R2`);
      }
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  // Ya hecho por migrar.mjs: se vuelve a generar (INSERT OR IGNORE no pisa), así este script solo ya deja todo en la base.
  const r = generarSql(notas, { porArchivo, prefijo: 'archivo' });
  fs.mkdirSync(salida, { recursive: true });
  for (const f of fs.readdirSync(salida)) if (/^archivo-\d+\.sql$/.test(f)) fs.unlinkSync(path.join(salida, f));
  for (const a of r.archivos) fs.writeFileSync(path.join(salida, a.nombre), a.sql, 'utf8');
  const motivos = {};
  for (const s of r.saltadas) motivos[s.motivo] = (motivos[s.motivo] || 0) + 1;
  console.log(`Notas del archivo a migrar: ${r.migradas} en ${r.archivos.length} archivos (${salida}); rescatadas leyendo el HTML de R2: ${rescatadas}${delDeposito ? `; el depósito dice ${delDeposito}` : ''}.`);
  console.log(`Saltadas: ${r.saltadas.length} ${JSON.stringify(motivos)} (las «sin cuerpo» eran noindex: nunca se ofrecieron a Google)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
