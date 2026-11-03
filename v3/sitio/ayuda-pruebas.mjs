// Ayuda para las pruebas: la base D1 de verdad armada con SQLite en memoria, una caché de mentira y notas de ejemplo. No se sube al Worker.
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const sql = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8');

/** Una D1 con la misma forma que usa el sitio (prepare/bind/all/first/run y batch), sobre SQLite en memoria con las tablas del núcleo y del sitio. */
export function baseDePrueba() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(sql('../nucleo/db/schema.sql'));
  sqlite.exec(sql('./db/schema-sitio.sql'));
  const sentencia = (texto) => ({
    texto,
    params: [],
    bind(...p) { this.params = p; return this; },
    async all() { return { results: sqlite.prepare(texto).all(...this.params) }; },
    async first() { return sqlite.prepare(texto).get(...this.params) ?? null; },
    async run() { sqlite.prepare(texto).run(...this.params); return { success: true }; },
  });
  const DB = {
    prepare: sentencia,
    async batch(lista) { for (const s of lista) sqlite.prepare(s.texto).run(...s.params); return lista.map(() => ({ success: true })); },
  };
  return { sqlite, env: { DB, INDEXAR: 'si' } };
}

/** Una caché como la de Cloudflare, en un Map. */
export function cacheDePrueba() {
  const m = new Map();
  return {
    m,
    async match(pedido) { const r = m.get(pedido.url); return r ? r.clone() : undefined; },
    async put(pedido, r) { m.set(pedido.url, r); },
  };
}

/** Inserta una nota del núcleo (con lo que se le pase por encima de los valores de ejemplo). */
export function insertarNota(sqlite, o = {}) {
  const n = {
    id: 'abc1234', historia_id: 'h1', creada: '2026-11-02T20:00:00.000Z', titulo: 'Se inauguró la nueva sala del hospital', bajada: 'La obra tardó dos años.',
    cuerpo: JSON.stringify(['Primer párrafo de la nota.', 'Segundo párrafo con más datos.']), seccion: 'Balcarce', en_dos_lineas: 'Abrió la sala. Atiende desde el lunes.',
    ficha: null, foto: JSON.stringify({ url: 'https://fotos.example/a.jpg', credito: 'Foto: Municipalidad', alt: 'La sala nueva', ancho: 1200, alto: 800 }),
    fuentes: JSON.stringify([{ medio: 'Diario A', url: 'https://a.example/1' }, { medio: 'Diario B', url: 'https://b.example/2' }]),
    fecha_hecho: '2026-11-02T19:00:00.000Z', firma: 'Redacción Radar Balcarce', estado: 'publicada', ...o,
  };
  sqlite.prepare(`INSERT INTO notas (id, historia_id, creada, titulo, bajada, cuerpo, seccion, en_dos_lineas, ficha, foto, fuentes, fecha_hecho, firma, estado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(n.id, n.historia_id, n.creada, n.titulo, n.bajada, n.cuerpo, n.seccion, n.en_dos_lineas, n.ficha, n.foto, n.fuentes, n.fecha_hecho, n.firma, n.estado);
  return n;
}

export const FICHA_COMPLETA = {
  que: 'Inauguración de una sala', quien: 'El hospital municipal', donde: 'Balcarce', cuando: 'Este lunes',
  numeros: [{ valor: '12', unidad: 'camas', que: 'tiene la sala', fuente: 'Diario A' }],
  cronologia: [{ fecha: '2024', que: 'Empezó la obra' }, { fecha: '2025', que: 'Se frenó por falta de fondos' }, { fecha: '2026', que: 'Se terminó' }],
  faltaSaber: ['Cuándo llegan los médicos nuevos'],
};
