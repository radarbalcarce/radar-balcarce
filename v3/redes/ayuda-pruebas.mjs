// Ayuda para las pruebas de las redes (no se sube al Worker): un Meta de mentira que contesta por dirección y la base D1 armada con SQLite en memoria.
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const sql = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8');

/**
 * Un fetch de Meta de mentira. `reglas` es una lista de [expresión sobre "MÉTODO camino", respuesta]; la respuesta es un objeto (200), un { status, cuerpo }
 * o una función (url, init) → lo mismo. Anota cada pedido en `pedidos` (con el cuerpo ya leído en `params`).
 */
export function metaDeMentira(reglas) {
  const pedidos = [];
  const fetchFn = async (url, init = {}) => {
    const u = new URL(String(url));
    const camino = u.pathname.replace(/^\/v[\d.]+\//, '');
    const params = Object.fromEntries(init.body ? new URLSearchParams(String(init.body)) : u.searchParams);
    pedidos.push({ metodo: init.method || 'GET', camino, params, token: String(init.headers?.Authorization ?? '').replace('Bearer ', '') });
    for (const [patron, respuesta] of reglas) {
      if (patron.test(`${init.method || 'GET'} ${camino}`)) {
        let r = typeof respuesta === 'function' ? respuesta(u, init) : respuesta;
        if (r instanceof Error) throw r;
        const status = r && r.status ? r.status : 200;
        const cuerpo = r && r.status ? r.cuerpo : r;
        return { ok: status >= 200 && status < 300, status, json: async () => cuerpo };
      }
    }
    return { ok: false, status: 404, json: async () => ({ error: { message: `sin regla para ${camino}` } }) };
  };
  return { fetchFn, pedidos };
}

/** Una D1 con la misma forma que usa el Worker (prepare/bind/all/first/run y batch), sobre SQLite en memoria con las tablas del núcleo, del sitio y de las redes. */
export function baseDePrueba() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(sql('../nucleo/db/schema.sql'));
  sqlite.exec(sql('../sitio/db/schema-sitio.sql'));
  sqlite.exec(sql('./schema-redes.sql'));
  const sentencia = (texto) => ({
    texto,
    params: [],
    bind(...p) { this.params = p; return this; },
    async all() { return { results: sqlite.prepare(texto).all(...this.params) }; },
    async first() { return sqlite.prepare(texto).get(...this.params) ?? null; },
    async run() { const r = sqlite.prepare(texto).run(...this.params); return { success: true, meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; },
  });
  const DB = {
    prepare: sentencia,
    async batch(lista) { for (const s of lista) sqlite.prepare(s.texto).run(...s.params); return lista.map(() => ({ success: true })); },
  };
  return { sqlite, DB };
}

/** Guarda una historia con su nota en la base (como las deja el núcleo). Devuelve el id de la nota. */
export function guardarNota(sqlite, { id, titulo, seccion = 'Balcarce', motivo = 'balcarce', medios = ['Medio A'], estado = 'publicada', creada, foto = { url: 'https://radarbalcarce.com/fotos-notas/a.jpg', credito: 'Muni', ancho: 1200, alto: 900 }, noPublicar = null, enDosLineas = 'Qué pasó y qué sigue.', origen = null }) {
  sqlite.prepare("INSERT INTO historias (id, creada, fecha_hecho, titulo, medios, alcances, estado, motivo, seccion, nota_id) VALUES (?, ?, ?, ?, ?, '[]', 'redactada', ?, ?, ?)")
    .run(`h-${id}`, creada, creada, titulo, JSON.stringify(medios), motivo, seccion, id);
  sqlite.prepare('INSERT INTO notas (id, historia_id, creada, titulo, bajada, cuerpo, seccion, en_dos_lineas, foto, no_publicar, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, `h-${id}`, creada, titulo, 'La bajada.', '["p"]', seccion, enDosLineas, foto ? JSON.stringify(foto) : null, noPublicar ? JSON.stringify(noPublicar) : null, estado);
  if (origen) sqlite.prepare('INSERT INTO sitio_notas (id, slug, publicada_en, origen) VALUES (?, ?, ?, ?)').run(id, 'slug-fijo', creada, origen);
  return id;
}
