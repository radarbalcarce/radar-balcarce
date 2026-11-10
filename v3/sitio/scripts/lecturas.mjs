// El resumen del contador propio (REGLAS.md § 11) en texto claro, para quien no programa:
//   node v3/sitio/scripts/lecturas.mjs [--dias=7]
// Lee la base D1 `radar-nucleo` con wrangler (las credenciales CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID, las mismas de los otros scripts de esta carpeta).
// Sólo lee: no escribe nada ni imprime claves.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { WRANGLER, hayCredenciales } from './wrangler.mjs';
import { vistasPorDia, vistasPor, notasMasLeidas, avisosEntre } from '../db/lecturas.mjs';
import { partesEnBalcarce } from '../util.mjs';

const BASE = 'radar-nucleo';

/** Un literal SQL seguro para el valor que reemplaza a un `?` (los textos con comillas simples duplicadas; sólo se usan fechas y números propios). */
const literal = (v) => (typeof v === 'number' && Number.isFinite(v) ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

/** Una «base» con la forma mínima que usan las consultas de db/lecturas.mjs (`prepare().bind().all()`), que corre cada SQL por `ejecutar(sql) → filas`. */
export function dbPorSql(ejecutar) {
  return {
    prepare(texto) {
      return {
        params: [],
        bind(...p) { this.params = p; return this; },
        async all() {
          let i = 0;
          const sql = texto.replace(/\?/g, () => literal(this.params[i++]));
          return { results: await ejecutar(sql) };
        },
      };
    },
  };
}

/** Corre un SQL de sólo lectura con wrangler contra la base remota y devuelve las filas. */
export function ejecutarConWrangler(sql, { env = process.env } = {}) {
  return new Promise((resolve, reject) => {
    let salida = '';
    let error = '';
    const p = spawn('npx', [...WRANGLER, 'd1', 'execute', BASE, '--remote', '--json', '--command', sql], { env, shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    p.stdout.on('data', (d) => { salida += d; });
    p.stderr.on('data', (d) => { error += d; });
    p.on('error', reject);
    p.on('close', (codigo) => {
      if (codigo !== 0) return reject(new Error(`wrangler terminó con error (${codigo}): ${error.slice(-300)}`));
      try { resolve(JSON.parse(salida.slice(salida.indexOf('[')))[0]?.results ?? []); } catch (e) { reject(new Error(`No se pudo leer la respuesta de wrangler: ${e.message}`)); }
    });
  });
}

const NOMBRES = {
  tipo: { portada: 'Portada', nota: 'Notas', seccion: 'Secciones', clima: 'Clima', farmacias: 'Farmacias', otra: 'Otras páginas' },
  zona: { balcarce: 'Balcarce', provincia: 'Resto de la provincia', argentina: 'Resto del país', afuera: 'Del exterior', desconocido: 'Sin dato' },
  origen: { directo: 'Directo (sin página de origen)', interno: 'Desde el propio sitio', google: 'Google', facebook: 'Facebook', instagram: 'Instagram', x: 'X / Twitter', 'otro-sitio': 'Otro sitio' },
  aparato: { celular: 'Celular', escritorio: 'Computadora o tablet' },
};

const miles = (n) => Number(n || 0).toLocaleString('es-AR');
const porcentaje = (parte, total) => (total ? `${Math.round((100 * parte) / total)} %` : '0 %');

/** El resumen en texto, a partir de lo que devuelven las consultas. Función pura (se prueba sin red). */
export function armarResumen({ dias, porDia, porTipo, porZona, porOrigen, porAparato, notas, avisos, desde, hasta }) {
  const total = porDia.reduce((s, f) => s + Number(f.vistas || 0), 0);
  const L = [];
  L.push(`LECTURAS DE RADAR BALCARCE · últimos ${dias} días (${desde} al ${hasta})`);
  L.push('Cuenta páginas vistas por personas: no robots, no gente que no entró de verdad. Sin cookies ni datos personales.');
  L.push('');
  L.push(`Páginas vistas en total: ${miles(total)}`);
  L.push('');
  L.push('Por día:');
  for (const f of porDia) L.push(`  ${f.dia}  ${miles(f.vistas)}`);
  if (!porDia.length) L.push('  (todavía no hay datos)');
  const bloque = (titulo, filas, nombres) => {
    L.push(''); L.push(`${titulo}:`);
    for (const f of filas) L.push(`  ${(nombres[f.clave] ?? f.clave).padEnd(34)} ${String(miles(f.vistas)).padStart(8)}  ${porcentaje(f.vistas, total).padStart(5)}`);
    if (!filas.length) L.push('  (sin datos)');
  };
  bloque('Por tipo de página', porTipo, NOMBRES.tipo);
  bloque('De dónde leen', porZona, NOMBRES.zona);
  bloque('Cómo llegaron', porOrigen, NOMBRES.origen);
  bloque('Con qué aparato', porAparato, NOMBRES.aparato);
  L.push(''); L.push('Las notas más leídas:');
  for (const f of notas) L.push(`  ${String(miles(f.vistas)).padStart(6)}  ${f.ruta}`);
  if (!notas.length) L.push('  (sin datos)');
  L.push(''); L.push('Avisos propios (impresiones = veces que se mostró; clics = veces que lo tocaron):');
  for (const f of avisos) L.push(`  ${String(f.aviso_id).padEnd(30)} se mostró ${String(miles(f.impresiones)).padStart(7)} veces · lo tocaron ${String(miles(f.clics)).padStart(5)} veces (${f.impresiones ? ((100 * f.clics) / f.impresiones).toFixed(1).replace('.', ',') : '0,0'} %)`);
  if (!avisos.length) L.push('  (sin datos)');
  return L.join('\n');
}

const fechaDe = (d) => { const p = partesEnBalcarce(d); return `${p.anio}-${String(p.mes).padStart(2, '0')}-${String(p.dia).padStart(2, '0')}`; };

/** Junta todo lo del resumen de `dias` días con la base `env` ({ DB }). */
export async function resumenDeLecturas(env, { dias = 7, ahora = new Date() } = {}) {
  const [porDia, porTipo, porZona, porOrigen, porAparato, notas, avisos] = await Promise.all([
    vistasPorDia(env, dias, ahora), vistasPor(env, 'tipo', dias, ahora), vistasPor(env, 'zona', dias, ahora), vistasPor(env, 'origen', dias, ahora),
    vistasPor(env, 'aparato', dias, ahora), notasMasLeidas(env, dias, 10, ahora), avisosEntre(env, fechaDe(new Date(ahora.getTime() - (dias - 1) * 86400000)), fechaDe(ahora)),
  ]);
  return armarResumen({ dias, porDia, porTipo, porZona, porOrigen, porAparato, notas, avisos, desde: fechaDe(new Date(ahora.getTime() - (dias - 1) * 86400000)), hasta: fechaDe(ahora) });
}

async function main(argv) {
  const dias = Math.min(90, Math.max(1, Number(/--dias=(\d+)/.exec(argv.join(' '))?.[1] ?? 7)));
  if (!hayCredenciales()) { console.error('Faltan CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID en el entorno.'); return 2; }
  try {
    console.log(await resumenDeLecturas({ DB: dbPorSql((sql) => ejecutarConWrangler(sql)) }, { dias }));
    return 0;
  } catch (e) { console.error(`No se pudo leer el contador: ${e.message}`); return 1; }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exitCode = await main(process.argv.slice(2));
