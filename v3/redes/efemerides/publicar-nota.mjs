// Arma la nota del diario de «Un día como hoy» de un día y deja lista la carga: el SQL de la nota y las fotos libres de Commons para subir al depósito del sitio.
// Lo corre el workflow «Radar 3.0: nota de Un día como hoy» (v3-nota-efemeride.yml), que a las 7:07 de Balcarce dispara el Worker radar-redes. Sin IA ni claves.
//
//   node v3/redes/efemerides/publicar-nota.mjs [--dia=AAAA-MM-DD] [--salida=carpeta]
//
// Escribe en la carpeta de salida: nota.sql, fotos.json (qué subir y a dónde) y las imágenes. Sin pieza para ese día (ningún hecho que se pueda publicar), no escribe nada y sale bien
// (ese día no sale nota, como tampoco sale el reel: no es una falla). Reglas: v3/redes/efemerides/REGLAS.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UA, clienteJson } from './armar.mjs';
import { placaPng } from './placas.mjs';
import { hechosDelDia, fotoDeCommons, notaDeEfemeride, sqlDeEfemeride, slugDeLaNota, BASE_DEL_SITIO, ID_DE_NOTA } from './nota.mjs';

const RAIZ = path.join(import.meta.dirname, '..', '..', '..');
const DATOS = path.join(RAIZ, 'web', 'data');
const EXTENSION = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const leer = (archivo) => JSON.parse(fs.readFileSync(path.join(DATOS, archivo), 'utf8'));

/** El día de hoy en Balcarce (AAAA-MM-DD). */
export const hoyEnBalcarce = (ahora = new Date()) => new Date(new Date(ahora).getTime() - 3 * 3600_000).toISOString().slice(0, 10);

/** Los bytes de una imagen, con nuestro User-Agent (Commons lo pide). null si falla. */
export function bajarImagen(traer = fetch) {
  return async (url) => {
    try {
      const r = await traer(url, { headers: { 'user-agent': UA } });
      if (!r.ok) return null;
      return { bytes: new Uint8Array(await r.arrayBuffer()), mime: (r.headers.get('content-type') || '').split(';')[0] };
    } catch { return null; }
  };
}

/**
 * Arma todo. `piezas` y `candidatas` son web/data/efemerides-piezas.json y efemerides-candidatas.json; `json` y `bajar` traen de la red. Devuelve
 * { nota, sql, fotos: [{ archivo, bytes, mime }], hechos } o null si ese día no hay con qué.
 */
export async function armarNotaDelDia({ dia, piezas, candidatas, json, bajar, dibujar, ahora = new Date().toISOString() }) {
  const pieza = piezas?.dias?.[dia] ?? null;
  const delDia = candidatas?.dias?.[dia]?.candidatas ?? [];
  const hechos = hechosDelDia(pieza, delDia);
  if (!hechos.length) return null;
  const fotosPublicas = {}; const fotos = []; const conFoto = [];
  for (const h of hechos) {
    let foto = null;
    try { foto = await fotoDeCommons(h, { json, bajar }); } catch { foto = null; } // sin foto, va la placa del año: una foto que falla nunca frena la nota
    const placa = await (dibujar ?? placaPng)({ anio: h.anio, foto });
    if (!placa.conFoto) foto = null;
    const archivo = `efemeride-${dia}-${h.id}.png`;
    fotos.push({ archivo, bytes: placa.bytes, mime: 'image/png' });
    fotosPublicas[h.id] = { placa: `${BASE_DEL_SITIO}/fotos-notas/${archivo}` };
    if (foto) { // la foto original, sin recorte: la usan la portada y las redes (horizontal)
      const original = `efemeride-${dia}-${h.id}-foto.${EXTENSION[foto.mime] ?? 'jpg'}`;
      fotos.push({ archivo: original, bytes: foto.bytes, mime: foto.mime });
      fotosPublicas[h.id].original = `${BASE_DEL_SITIO}/fotos-notas/${original}`;
    }
    conFoto.push({ ...h, foto });
  }
  const nota = notaDeEfemeride({ dia, hechos: conFoto, fotosPublicas });
  return { nota, sql: sqlDeEfemeride(nota, ahora), fotos, hechos: conFoto.map((h) => ({ anio: h.anio, titulo: h.titulo, foto: !!h.foto })), slug: slugDeLaNota(nota), id: ID_DE_NOTA(dia) };
}

export async function main({ argv = process.argv.slice(2), traer = fetch, log = (t) => process.stdout.write(`${t}\n`), ahora = new Date() } = {}) {
  const args = Object.fromEntries(argv.map((a) => a.replace(/^--/, '').split('=')));
  const dia = args.dia || hoyEnBalcarce(ahora);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) throw new Error(`día inválido: ${dia}`);
  const salida = path.resolve(args.salida || path.join(RAIZ, 'efemeride-salida'));
  const r = await armarNotaDelDia({
    dia, piezas: leer('efemerides-piezas.json'), candidatas: leer('efemerides-candidatas.json'),
    json: clienteJson({ traer }), bajar: bajarImagen(traer), ahora: new Date(ahora).toISOString(),
  });
  if (!r) { log(`${dia}: sin hechos para publicar; no sale nota`); return null; }
  fs.mkdirSync(salida, { recursive: true });
  fs.writeFileSync(path.join(salida, 'nota.sql'), r.sql);
  for (const f of r.fotos) fs.writeFileSync(path.join(salida, f.archivo), f.bytes);
  fs.writeFileSync(path.join(salida, 'fotos.json'), JSON.stringify(r.fotos.map((f) => ({ archivo: f.archivo, mime: f.mime })), null, 1));
  log(JSON.stringify({ dia, id: r.id, titulo: r.nota.titulo, slug: r.slug, hechos: r.hechos, fotos: r.fotos.length }));
  return r;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((e) => { process.stderr.write(`${e.message}\n`); process.exit(1); });
}
