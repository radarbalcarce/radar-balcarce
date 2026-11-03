// La migración del archivo viejo (sin red, sin base): de una nota del sistema viejo a las filas de `notas` y `sitio_notas`, y de las filas a SQL.
// Lo usa migrar.mjs (que lee los archivos y escribe los .sql) y lo prueba migracion.test.mjs.
import { BASE, normalizarSeccion, slugDe, parrafosDe } from '../util.mjs';

const sinSaltos = (x) => String(x ?? '').replace(/\s+/g, ' ').trim();
const FIRMA = 'Redacción Radar Balcarce';

const urlDeArchivo = (archivo) => (/^https?:\/\//i.test(archivo) ? archivo : `${BASE}/${String(archivo).replace(/^\/+/, '')}`);

function fechaDeLaNota(n) {
  for (const c of [n.fecha, n.visto, n.publicadaCuando]) if (c && Number.isFinite(Date.parse(c))) return new Date(c).toISOString();
  return null;
}

function fuentesDe(n) {
  const consultadas = (Array.isArray(n.fuentesConsultadas) ? n.fuentesConsultadas : [])
    .map((f) => ({ medio: sinSaltos(f?.medio), url: /^https?:\/\//i.test(f?.enlace || '') ? f.enlace : null }))
    .filter((f) => f.medio || f.url);
  if (consultadas.length) return consultadas;
  const medios = Array.isArray(n.medios) ? n.medios : [];
  return medios.map((m, i) => ({ medio: sinSaltos(m), url: i === 0 && /^https?:\/\//i.test(n.enlace || '') ? n.enlace : null }));
}

function firmaDe(n, fuentes) {
  if (n.propia === 'redaccion') return n.firma || FIRMA;
  if (n.propia) return n.firma || FIRMA;
  if (n.guion && !n.cuerpoAMano) {
    const k = fuentes.length || (n.medios || []).length || 1;
    return `${FIRMA}, escrita con IA a partir de ${k} ${k === 1 ? 'fuente' : 'fuentes'} y verificada contra ellas`;
  }
  if (n.como === 'publicada' || n.corregidaAMano || n.cuerpoAMano) return 'Revisada por la redacción de Radar Balcarce';
  const medio = (n.medios || [])[0];
  return medio ? `Resumen de la nota publicada por ${medio}` : FIRMA;
}

/** ¿Esta nota vieja se migra? Con título, con cuerpo y con fecha. Devuelve el motivo si no. */
export function motivoDeSalto(n) {
  if (!n || !n.id || !/^[a-z0-9]+$/i.test(String(n.id))) return 'sin id válido';
  if (!sinSaltos(n.titulo)) return 'sin título';
  if (parrafosDe(n.cuerpo).length === 0) return 'sin cuerpo';
  if (!fechaDeLaNota(n)) return 'sin fecha';
  return null;
}

/** Una nota vieja → { nota, sitio }: las filas listas para `notas` y `sitio_notas`. */
export function filasDeNotaVieja(n) {
  const fecha = fechaDeLaNota(n);
  const fuentes = fuentesDe(n);
  const foto = n.foto?.archivo ? { url: urlDeArchivo(n.foto.archivo), credito: sinSaltos(n.foto.credito) || null, alt: sinSaltos(n.titulo), ancho: n.foto.ancho || null, alto: n.foto.alto || null } : null;
  const fotosEnCuerpo = (Array.isArray(n.fotosEnCuerpo) ? n.fotosEnCuerpo : []).filter((f) => f?.archivo).map((f) => ({
    url: urlDeArchivo(f.archivo), alt: sinSaltos(f.epigrafe) || sinSaltos(n.titulo), ancho: f.ancho || null, alto: f.alto || null,
    leyenda: sinSaltos(f.leyenda) || null, despuesDe: Number.isInteger(f.despuesDe) ? f.despuesDe : null,
  }));
  const extra = fotosEnCuerpo.length ? { fotosEnCuerpo } : {};
  return {
    nota: {
      id: String(n.id),
      historia_id: `viejo-${n.id}`,
      creada: fecha,
      titulo: sinSaltos(n.titulo),
      bajada: sinSaltos(n.copete),
      cuerpo: JSON.stringify(parrafosDe(n.cuerpo)),
      seccion: normalizarSeccion(n.seccion || 'Argentina'),
      en_dos_lineas: null,
      ficha: null,
      no_publicar: null,
      verificacion: n.verificacion ? JSON.stringify(n.verificacion) : null,
      foto: foto ? JSON.stringify(foto) : null,
      fuentes: JSON.stringify(fuentes),
      fecha_hecho: fecha,
      firma: firmaDe(n, fuentes),
      pedidos: 0,
      estado: 'publicada',
    },
    sitio: {
      id: String(n.id),
      slug: (typeof n.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(n.slug) && n.slug) || slugDe(n.titulo),
      publicada_en: fecha,
      origen: n.propia === 'redaccion' ? 'redaccion' : 'viejo',
      extra: Object.keys(extra).length ? JSON.stringify(extra) : null,
    },
  };
}

const lit = (v) => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/\0/g, '').replace(/'/g, "''")}'`);

/** Las dos sentencias de una nota. `INSERT OR IGNORE`: correrlo de nuevo no duplica ni pisa. */
export function sqlDeFilas({ nota, sitio }) {
  const c1 = Object.keys(nota);
  const c2 = Object.keys(sitio);
  return `INSERT OR IGNORE INTO notas (${c1.join(', ')}) VALUES (${c1.map((k) => lit(nota[k])).join(', ')});\n`
    + `INSERT OR IGNORE INTO sitio_notas (${c2.join(', ')}) VALUES (${c2.map((k) => lit(sitio[k])).join(', ')});\n`;
}

/**
 * Todas las notas viejas → archivos .sql en tandas. Se repite por id: gana la primera que aparece (pasale primero la más fresca).
 * Devuelve { archivos: [{ nombre, sql, notas }], migradas, saltadas: [{ id, motivo }], repetidas }.
 */
export function generarSql(notas, { porArchivo = 100 } = {}) {
  const vistos = new Set();
  const filas = [];
  const saltadas = [];
  let repetidas = 0;
  for (const n of notas) {
    if (n?.id && vistos.has(String(n.id))) { repetidas += 1; continue; }
    const motivo = motivoDeSalto(n);
    if (n?.id) vistos.add(String(n.id));
    if (motivo) { saltadas.push({ id: n?.id ?? null, motivo }); continue; }
    filas.push(filasDeNotaVieja(n));
  }
  const archivos = [];
  for (let i = 0; i < filas.length; i += porArchivo) {
    const tanda = filas.slice(i, i + porArchivo);
    const numero = String(archivos.length + 1).padStart(3, '0');
    archivos.push({ nombre: `migracion-${numero}.sql`, notas: tanda.length, sql: `-- Tanda ${numero}: ${tanda.length} notas viejas (INSERT OR IGNORE: se puede repetir)\n${tanda.map(sqlDeFilas).join('\n')}` });
  }
  return { archivos, migradas: filas.length, saltadas, repetidas };
}
