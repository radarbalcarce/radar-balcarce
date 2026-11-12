// Arma el INSERT de una nota publicada a mano (las que se cargan desde GitHub, sin el bot). Lo corre el workflow «Radar 3.0: cargar una nota a mano».
// Uso: node cargar.mjs <archivo.json>  → imprime el SQL. Misma fila que guarda el bot en `publicar` (v3/redaccion/telegram/nota-propia.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const j = (v) => q(JSON.stringify(v));

export function sqlDeNota(n, ahora = new Date().toISOString()) {
  if (!/^[a-z0-9]{7}$/.test(n.id)) throw new Error('id inválido');
  for (const c of ['titulo', 'bajada', 'seccion', 'firma']) if (!String(n[c] ?? '').trim()) throw new Error(`falta ${c}`);
  if (!Array.isArray(n.cuerpo) || n.cuerpo.length < 3) throw new Error('el cuerpo tiene que ser una lista de párrafos');
  const slug = n.titulo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const corte = slug.length <= 70 ? slug : (() => { const c = slug.slice(0, 70); const g = c.lastIndexOf('-'); return (g > 30 ? c.slice(0, g) : c).replace(/-+$/, ''); })();
  const redes = { eleccion: 'solo-web', lista: [], confirmada: true, elegida: ahora };
  return `INSERT INTO notas (id, historia_id, creada, titulo, bajada, cuerpo, seccion, en_dos_lineas, ficha, no_publicar, verificacion, foto, fuentes, fecha_hecho, firma, pedidos, estado, origen, slug, publicada_en, redes) VALUES (${[
    q(n.id), q(`redaccion-${n.id}`), q(ahora), q(n.titulo), q(n.bajada), j(n.cuerpo), q(n.seccion), q(n.enDosLineas ?? ''), j(n.ficha ?? {}), 'NULL',
    j({ oracionesQuitadas: [], reescrita: false, propia: true }), 'NULL', j(n.fuentes ?? []), q(ahora), q(n.firma), '0', q('publicada'), q('redaccion'), q(corte), q(ahora), j(redes),
  ].join(', ')});`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(sqlDeNota(JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))));
}
