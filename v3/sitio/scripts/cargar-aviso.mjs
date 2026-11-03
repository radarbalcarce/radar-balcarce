// Arma el SQL para cargar (o sacar) un aviso local. No toca la base: imprime el SQL (o lo guarda con --salida=archivo.sql) y lo corre quien carga:
//   node v3/sitio/scripts/cargar-aviso.mjs aviso.json > aviso.sql
//   npx wrangler d1 execute radar-nucleo --remote --file=aviso.sql
//   node v3/sitio/scripts/cargar-aviso.mjs --sacar=sweet-candy-bar      (lo apaga; queda en la tabla)
// El JSON: { "id": "sweet-candy-bar", "comercio": "Sweet Candy Bar", "texto": "Tortas y mesas dulces", "imagen": "https://…/aviso.jpg",
//            "enlace": "https://instagram.com/…", "plan": "10000", "lugares": ["pie", "postales"], "desde": "2026-11-10", "hasta": "2026-12-10" }
// Ver docs/propuestas/MANUAL-AVISOS-3-0.md.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const LUGARES = ['fijo', 'postales', 'columna', 'pie', 'clima'];
export const PLANES = ['5000', '10000', '20000', '30000', '50000', 'libre'];
// Qué lugares incluye cada plan (PUBLICIDAD-PRIMER-COMERCIO.md § 2). Es una guía: un aviso "libre" puede llevar cualquiera.
export const LUGARES_DEL_PLAN = { 5000: ['pie'], 10000: ['pie', 'postales'], 20000: ['pie', 'postales', 'columna'], 30000: ['pie', 'postales', 'columna'], 50000: ['fijo', 'pie', 'postales', 'columna'] };

const sql = (v) => (v == null || v === '' ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const FECHA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const https = (u) => /^https:\/\/[^\s'"<>]+$/i.test(u);
const imagenOk = (u) => https(u) || /^\/[A-Za-z0-9][A-Za-z0-9/_.-]*$/.test(u);

export function idDe(comercio) {
  return String(comercio).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'aviso';
}

/** Valida un aviso y devuelve { aviso, errores }. */
export function validar(a) {
  const errores = [];
  if (!a || typeof a !== 'object') return { aviso: null, errores: ['El JSON tiene que ser un objeto.'] };
  const comercio = String(a.comercio ?? '').trim();
  if (!comercio) errores.push('Falta «comercio».');
  const id = String(a.id ?? '').trim() || idDe(comercio);
  if (!/^[a-z0-9][a-z0-9-]{0,40}$/.test(id)) errores.push('«id» sólo con minúsculas, números y guiones.');
  const texto = String(a.texto ?? '').trim();
  if (texto.length > 120) errores.push('«texto» de hasta 120 letras.');
  const imagen = String(a.imagen ?? '').trim();
  if (imagen && !imagenOk(imagen)) errores.push('«imagen» tiene que ser una dirección https o una ruta del sitio (/fotos-notas/…).');
  const enlace = String(a.enlace ?? '').trim();
  if (enlace && !https(enlace)) errores.push('«enlace» tiene que empezar con https://.');
  if (!imagen && !texto) errores.push('Hace falta «texto» o «imagen».');
  const plan = String(a.plan ?? 'libre').trim();
  if (!PLANES.includes(plan)) errores.push(`«plan» tiene que ser uno de: ${PLANES.join(', ')}.`);
  const lugares = Array.isArray(a.lugares) ? [...new Set(a.lugares.map(String))] : (plan in LUGARES_DEL_PLAN ? LUGARES_DEL_PLAN[plan] : []);
  if (!lugares.length) errores.push('Faltan «lugares» (fijo, postales, columna, pie, clima).');
  for (const l of lugares) if (!LUGARES.includes(l)) errores.push(`Lugar desconocido: «${l}».`);
  const desde = String(a.desde ?? '').trim();
  const hasta = String(a.hasta ?? '').trim();
  if (desde && !FECHA.test(desde)) errores.push('«desde» como AAAA-MM-DD.');
  if (hasta && !FECHA.test(hasta)) errores.push('«hasta» como AAAA-MM-DD.');
  if (desde && hasta && desde > hasta) errores.push('«desde» es posterior a «hasta».');
  return { aviso: { id, comercio, texto, imagen, enlace, plan, lugares, desde, hasta, activo: a.activo === 0 || a.activo === false ? 0 : 1 }, errores };
}

/** El SQL que inserta el aviso (o lo reemplaza si el id ya existe). */
export function sqlDeAviso(a) {
  const { aviso, errores } = validar(a);
  if (errores.length) throw new Error(errores.join(' '));
  return `INSERT INTO avisos (id, comercio, texto, imagen, enlace, plan, lugares, desde, hasta, activo)
VALUES (${sql(aviso.id)}, ${sql(aviso.comercio)}, ${sql(aviso.texto)}, ${sql(aviso.imagen)}, ${sql(aviso.enlace)}, ${sql(aviso.plan)}, ${sql(JSON.stringify(aviso.lugares))}, ${sql(aviso.desde)}, ${sql(aviso.hasta)}, ${aviso.activo})
ON CONFLICT(id) DO UPDATE SET comercio = excluded.comercio, texto = excluded.texto, imagen = excluded.imagen, enlace = excluded.enlace, plan = excluded.plan,
  lugares = excluded.lugares, desde = excluded.desde, hasta = excluded.hasta, activo = excluded.activo;
`;
}

/** El SQL que apaga un aviso (no lo borra: queda para el historial). */
export function sqlParaSacar(id) {
  if (!/^[a-z0-9][a-z0-9-]{0,40}$/.test(String(id))) throw new Error('id inválido');
  return `UPDATE avisos SET activo = 0 WHERE id = ${sql(id)};\n`;
}

function main(argv) {
  const sacar = argv.find((x) => x.startsWith('--sacar='));
  const salida = argv.find((x) => x.startsWith('--salida='));
  const archivo = argv.find((x) => !x.startsWith('--'));
  let texto;
  try {
    if (sacar) texto = sqlParaSacar(sacar.slice(8));
    else if (archivo) texto = sqlDeAviso(JSON.parse(readFileSync(archivo, 'utf8')));
    else { console.error('Uso: cargar-aviso.mjs aviso.json [--salida=aviso.sql]  |  cargar-aviso.mjs --sacar=<id>'); return 2; }
  } catch (e) { console.error(`No se pudo armar el aviso: ${e.message}`); return 1; }
  if (salida) writeFileSync(salida.slice(9), texto); else process.stdout.write(texto);
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exitCode = main(process.argv.slice(2));
