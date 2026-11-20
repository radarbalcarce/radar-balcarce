// Corrige una nota de Se hace ya publicada SIN volver a pedir IA (20/11/2026): marca su foto como placa (se ve entera, nunca recortada) y le agrega el video de YouTube de la entrada, si lo tiene.
//
//   node v3/nucleo/sehace/corregir-nota.mjs <id> <url-de-la-entrada>
//
// Lee la entrada (una sola descarga a sehace.com), saca el video con `videoDeEntrada` y escribe en pantalla el SQL del UPDATE; NO toca la base. Se corre aparte con
//   wrangler d1 execute radar-nucleo --remote --command "<el SQL>"        (desde v3/nucleo, con la cuenta radarbalcarce)
import { pathToFileURL } from 'node:url';
import { videoDeEntrada, slugDeEntrada } from './sehace.mjs';

const ID_DE_NOTA = /^h[a-z0-9]{6}$/;
const ID_DE_VIDEO = /^[A-Za-z0-9_-]{11}$/;

/** El SQL de la corrección. `video` es el id de 11 caracteres o null (entonces sólo se marca la foto). */
export function sqlDeCorreccion({ id, video = null }) {
  if (!ID_DE_NOTA.test(String(id))) throw new Error(`id de nota inválido: «${id}» (se espera h + 6 letras o números)`);
  if (video !== null && !ID_DE_VIDEO.test(String(video))) throw new Error(`id de video inválido: «${video}»`);
  const sql = [
    `UPDATE notas SET foto = json_set(foto, '$.esPlaca', json('true'), '$.cubrir', json('false')) WHERE id = '${id}' AND foto IS NOT NULL;`,
  ];
  if (video) {
    sql.push(`UPDATE sitio_notas SET extra = json_patch(COALESCE(extra, '{}'), json_object('video', json_object('youtube', '${video}', 'titulo', substr((SELECT titulo FROM notas WHERE id = '${id}'), 1, 120)))) WHERE id = '${id}';`);
  }
  return sql.join(' ');
}

export async function corregirNota(id, urlEntrada, { fetch: fetchFn = fetch } = {}) {
  if (!slugDeEntrada(urlEntrada)) throw new Error('la dirección no es de una entrada de https://sehace.com/blog/<slug>/');
  const r = await fetchFn(urlEntrada, { headers: { 'user-agent': 'RadarBalcarceBot (+https://radarbalcarce.com)', accept: 'text/html' } });
  if (!r.ok) throw new Error(`la entrada respondió HTTP ${r.status}`);
  const video = videoDeEntrada(await r.text());
  return { video, sql: sqlDeCorreccion({ id, video }) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [id, url] = process.argv.slice(2);
  if (!id || !url) { console.error('Uso: node v3/nucleo/sehace/corregir-nota.mjs <id> <url-de-la-entrada>'); process.exit(1); }
  try {
    const { video, sql } = await corregirNota(id, url);
    console.error(video ? `Video encontrado: https://www.youtube.com/watch?v=${video}` : 'La entrada no tiene video: sólo se marca la foto.');
    console.log(sql);
  } catch (e) { console.error(`Error: ${e.message}`); process.exit(1); }
}
