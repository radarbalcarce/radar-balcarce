// Hace una copia propia de la foto de cada nota publicada y se la anota en la base (v3/nucleo/REGLAS.md § 7 bis). Lo corre el workflow «Radar 3.0: fotos propias».
//   node v3/sitio/scripts/copiar-fotos-de-notas.mjs [--tope=60] [--lectura=500] [--simular] [--forzar-reintentos]
// Necesita CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID (la base D1) y, para el depósito, R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY (si faltan, usa wrangler con el mismo token).
//
// Qué hace, nota por nota (las más nuevas primero, hasta `--tope` por corrida):
//   1. Lee de D1 las `--lectura` notas publicadas más nuevas que tienen foto y todavía no tienen `copia`.
//   2. Baja la foto de la fuente con un User-Agent propio y honesto (RadarBalcarceBot) y SIN cabeceras de navegador: si el medio la rechaza (403, etc.), la nota queda con la
//      original y se anota el motivo; no se intenta esquivar nada. Comprueba que sea una imagen de verdad (por los primeros bytes, no por lo que diga el servidor).
//   3. La pasa a JPEG con ffmpeg en dos tamaños (hasta 1.600 px y hasta 640 px de ancho, sin datos de la cámara) y las guarda en R2 (`copias/<huella>.jpg` y `-640.jpg`).
//      La huella es el contenido de la foto: la misma foto en dos notas se guarda una sola vez.
//   4. Le suma a `notas.foto` los campos copia, copiaChica, copiaAncho, copiaAlto y copiaEn (url, crédito, alt y epígrafe no se tocan). La escritura sólo vale si la foto sigue
//      siendo la que se leyó (si el núcleo la cambió mientras tanto, no se pisa y se vuelve a intentar la próxima).
//   Si falla, anota copiaIntentos / copiaIntentada / copiaError; con 3 fallos deja de insistir (salvo `--forzar-reintentos`) y espera al menos 3 horas entre intentos.
// Es idempotente: una nota con copia no se vuelve a tocar. No gasta IA. Escribe un informe JSON (qué copió y qué falló) en INFORME_FOTOS (por defecto v3/sitio/scripts/salida/fotos-copia.json).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { medirImagen, USER_AGENT } from '../../redes/piezas/fotos.mjs';
import { ANCHO_GRANDE, ANCHO_CHICA, claveR2DeCopia, urlDeCopia, yaEsPropia } from '../fotos-copia.mjs';
import { esDireccionPublica } from '../direccion-publica.mjs';
import { correrWrangler, hayCredenciales, enParalelo } from './wrangler.mjs';

export const DEPOSITO = 'radar-fotos';
export const TOPE_POR_CORRIDA = 60;
export const NOTAS_A_LEER = 500;
export const FALLOS_MAXIMOS = 3;
export const HORAS_ENTRE_INTENTOS = 3;
export const BYTES_MAXIMOS = 15 * 1024 * 1024;
export const ANCHO_MINIMO = 300;
const MS_DE_DESCARGA = 20_000;
const SALTOS_MAXIMOS = 4;

// ------------------------------------------------------------------ lo puro

/** Qué clase de imagen es, mirando los primeros bytes (no se confía en lo que diga el servidor). null si no es una imagen. */
export function tipoDeImagen(b) {
  if (!b || b.length < 12) return null;
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'png';
  if (b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  if (b.toString('latin1', 4, 8) === 'ftyp' && /avif|avis/.test(b.toString('latin1', 8, 16))) return 'avif';
  if (b.toString('latin1', 0, 3) === 'GIF') return 'gif';
  return null;
}

export const huellaDe = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 24);

/** Las notas a las que les toca una copia: con foto de otro medio, sin copia, sin demasiados fallos y sin un intento reciente. Devuelve [{ id, texto, foto }], en el orden en que vinieron. */
export function pendientesDe(filas, { ahora = new Date(), tope = TOPE_POR_CORRIDA, forzar = false } = {}) {
  const salida = [];
  for (const f of filas ?? []) {
    let foto;
    try { foto = JSON.parse(f.foto); } catch { continue; }
    if (!foto || typeof foto !== 'object' || Array.isArray(foto)) continue;
    if (!/^https?:\/\//i.test(String(foto.url ?? '')) || yaEsPropia(foto.url) || foto.copia) continue;
    if (!forzar) {
      if ((foto.copiaIntentos || 0) >= FALLOS_MAXIMOS) continue;
      const ultimo = foto.copiaIntentada ? new Date(foto.copiaIntentada).getTime() : 0;
      if (ultimo && ahora.getTime() - ultimo < HORAS_ENTRE_INTENTOS * 3600_000) continue;
    }
    salida.push({ id: f.id, texto: f.foto, foto });
    if (salida.length >= tope) break;
  }
  return salida;
}

/** La foto con la copia anotada (lo demás queda igual). */
export const fotoConCopiaAnotada = (foto, { huella, ancho, alto }, ahoraISO) => {
  const { copiaIntentos, copiaIntentada, copiaError, ...resto } = foto;
  return { ...resto, copia: urlDeCopia(huella), copiaChica: urlDeCopia(huella, true), copiaAncho: ancho, copiaAlto: alto, copiaEn: ahoraISO };
};

/** La foto con el fallo anotado (cuántas veces, cuándo y por qué). */
export const fotoConFalloAnotado = (foto, motivo, ahoraISO) => ({ ...foto, copiaIntentos: (foto.copiaIntentos || 0) + 1, copiaIntentada: ahoraISO, copiaError: String(motivo).slice(0, 120) });

// ------------------------------------------------------------------ bajar, convertir, guardar

/**
 * Lee el cuerpo de una respuesta sin pasarse de `maximo` bytes: si el servidor no avisa el tamaño y manda gigas, se corta apenas se pasa (no se carga todo en memoria).
 * Con una respuesta sin `body` legible (las de las pruebas viejas) usa arrayBuffer.
 */
export async function leerConTope(r, maximo) {
  if (!r.body?.getReader) {
    const todo = Buffer.from(await r.arrayBuffer());
    if (todo.length > maximo) throw new Error('muy-pesada');
    return todo;
  }
  const lector = r.body.getReader();
  const partes = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.length;
    if (total > maximo) { try { await lector.cancel(); } catch { /* ya cortada */ } throw new Error('muy-pesada'); }
    partes.push(value);
  }
  return Buffer.concat(partes);
}

/**
 * Baja la foto de la fuente. Tira un Error con un motivo corto si no se puede (`http-403`, `no-es-imagen`, `muy-pesada`, `sin-respuesta`, `direccion-no-permitida`).
 * Seguridad (auditoría del 5/11): sólo direcciones públicas (`esDireccionPublica`), también en cada redirección (hasta 4, a mano), y con tope de bytes al leer.
 */
export async function descargar(url, { fetchFn = globalThis.fetch } = {}) {
  let actual = String(url);
  let r;
  for (let salto = 0; ; salto++) {
    if (!esDireccionPublica(actual)) throw new Error('direccion-no-permitida');
    try {
      r = await fetchFn(actual, { headers: { 'user-agent': USER_AGENT, accept: 'image/*' }, redirect: 'manual', signal: AbortSignal.timeout(MS_DE_DESCARGA) });
    } catch { throw new Error('sin-respuesta'); }
    if (r.status >= 300 && r.status < 400 && r.headers?.get?.('location')) {
      if (salto >= SALTOS_MAXIMOS) throw new Error('muchos-saltos');
      try { actual = new URL(r.headers.get('location'), actual).toString(); } catch { throw new Error('direccion-no-permitida'); }
      continue;
    }
    break;
  }
  if (!r.ok) throw new Error(`http-${r.status}`);
  const largo = Number(r.headers?.get?.('content-length'));
  if (largo && largo > BYTES_MAXIMOS) throw new Error('muy-pesada');
  const bytes = await leerConTope(r, BYTES_MAXIMOS);
  if (!tipoDeImagen(bytes)) throw new Error('no-es-imagen');
  return bytes;
}

/** Pasa cualquier imagen a JPEG de hasta `ancho` px de ancho (nunca la agranda), sin metadatos. Con ffmpeg; `ffmpeg` es la ruta del programa. */
export function aJpeg(bytes, ancho, ffmpeg) {
  const r = spawnSync(ffmpeg, [
    '-loglevel', 'error', '-i', 'pipe:0', '-frames:v', '1',
    '-vf', `scale='min(${ancho},iw)':-2:flags=lanczos`, '-pix_fmt', 'yuvj420p', '-q:v', '4', '-map_metadata', '-1', '-f', 'image2', '-c:v', 'mjpeg', 'pipe:1',
  ], { input: bytes, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0 || !r.stdout?.length || tipoDeImagen(r.stdout) !== 'jpeg') throw new Error('no-se-pudo-convertir');
  return r.stdout;
}

/**
 * Hace las dos versiones de una foto y las guarda (si no estaban). `deps`: { fetchFn, convertir(bytes, ancho) → Buffer, existe(clave), guardar(clave, bytes) }.
 * Devuelve { huella, ancho, alto, subidas }. Tira un Error con el motivo si algo falla; nada queda a medias en la base (eso es de quien llama).
 */
export async function copiarUnaFoto(url, deps) {
  const original = await descargar(url, { fetchFn: deps.fetchFn });
  const huella = huellaDe(original);
  const grande = deps.convertir(original, ANCHO_GRANDE);
  const medidas = medirImagen(grande);
  if (!medidas.ancho || !medidas.alto) throw new Error('sin-medidas');
  if (medidas.ancho < ANCHO_MINIMO) throw new Error('muy-chica');
  const chica = deps.convertir(original, ANCHO_CHICA);
  let subidas = 0;
  for (const [esChica, bytes] of [[false, grande], [true, chica]]) {
    const clave = claveR2DeCopia(huella, esChica);
    if (await deps.existe(clave)) continue;
    await deps.guardar(clave, bytes);
    subidas += 1;
  }
  return { huella, ancho: medidas.ancho, alto: medidas.alto, subidas, bytesGrande: grande.length, bytesChica: chica.length };
}

// ------------------------------------------------------------------ la base (API REST de D1)

/** D1 por la API REST de Cloudflare. `consultar(sql, params)` → { filas, cambios }. */
export function clienteD1({ cuenta, token, nombre = 'radar-nucleo', fetchFn = globalThis.fetch }) {
  let uuid = null;
  async function api(ruta, opciones = {}) {
    const r = await fetchFn(`https://api.cloudflare.com/client/v4/accounts/${cuenta}${ruta}`, { ...opciones, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' } });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.success) throw new Error(`D1: HTTP ${r.status} ${String(j?.errors?.[0]?.message ?? '').slice(0, 120)}`);
    return j;
  }
  async function id() {
    if (uuid) return uuid;
    const j = await api(`/d1/database?name=${encodeURIComponent(nombre)}`);
    const base = (j.result ?? []).find((d) => d.name === nombre);
    if (!base?.uuid) throw new Error(`D1: no encuentro la base ${nombre}`);
    uuid = base.uuid;
    return uuid;
  }
  return {
    async consultar(sql, params = []) {
      const j = await api(`/d1/database/${await id()}/query`, { method: 'POST', body: JSON.stringify({ sql, params }) });
      const r = j.result?.[0] ?? {};
      return { filas: r.results ?? [], cambios: r.meta?.changes ?? 0 };
    },
  };
}

export const SQL_PENDIENTES = `SELECT n.id, n.foto FROM notas n LEFT JOIN sitio_notas s ON s.id = n.id
  WHERE n.estado = 'publicada' AND n.foto IS NOT NULL AND n.foto != 'null' AND n.foto NOT LIKE '%"copia":%'
  ORDER BY COALESCE(s.publicada_en, n.creada) DESC LIMIT ?`;
export const SQL_ANOTAR = 'UPDATE notas SET foto = ? WHERE id = ? AND foto = ?';

// ------------------------------------------------------------------ la corrida

/**
 * Una corrida entera. `deps`: { d1, copiar(url) → resultado, ahora(), log, simular }. Devuelve el informe { leidas, pendientes, copiadas: [...], falladas: [...], noAnotadas: [...] }.
 */
export async function correr({ d1, copiar, ahora = () => new Date(), log = () => {}, tope = TOPE_POR_CORRIDA, lectura = NOTAS_A_LEER, simular = false, forzar = false, enParaleloN = 4 }) {
  const { filas } = await d1.consultar(SQL_PENDIENTES, [lectura]);
  const pendientes = pendientesDe(filas, { ahora: ahora(), tope, forzar });
  const informe = { leidas: filas.length, pendientes: pendientes.length, copiadas: [], falladas: [], noAnotadas: [], simulado: simular };
  log(`Notas con foto de otro medio y sin copia entre las ${filas.length} más nuevas leídas: ${pendientes.length} (tope ${tope}).`);
  await enParalelo(pendientes.map((p) => async () => {
    if (simular) { informe.copiadas.push({ id: p.id, url: p.foto.url, simulada: true }); return; }
    let nuevo;
    let resultado = null;
    try {
      resultado = await copiar(p.foto.url);
      nuevo = fotoConCopiaAnotada(p.foto, resultado, ahora().toISOString());
    } catch (e) {
      const motivo = String(e?.message ?? e);
      nuevo = fotoConFalloAnotado(p.foto, motivo, ahora().toISOString());
      informe.falladas.push({ id: p.id, url: p.foto.url, motivo });
      log(`  x ${p.id}: ${motivo}`);
    }
    try {
      const { cambios } = await d1.consultar(SQL_ANOTAR, [JSON.stringify(nuevo), p.id, p.texto]);
      if (!cambios) { informe.noAnotadas.push(p.id); if (resultado) informe.falladas.push({ id: p.id, url: p.foto.url, motivo: 'la-foto-cambio-mientras-tanto' }); return; }
      if (resultado) { informe.copiadas.push({ id: p.id, url: p.foto.url, huella: resultado.huella, ancho: resultado.ancho, alto: resultado.alto, bytesGrande: resultado.bytesGrande, bytesChica: resultado.bytesChica }); log(`  ok ${p.id} → ${resultado.huella} (${resultado.ancho}×${resultado.alto})`); }
    } catch (e) {
      informe.falladas.push({ id: p.id, url: p.foto.url, motivo: `no-se-pudo-anotar: ${String(e?.message ?? e).slice(0, 100)}` });
    }
  }), enParaleloN);
  return informe;
}

// ------------------------------------------------------------------ las dependencias de verdad

async function depositoR2(env) {
  if (env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY) {
    const { clienteR2 } = await import('../../../infra/compartido/r2-s3.mjs');
    const r2 = clienteR2({ cuenta: env.CLOUDFLARE_ACCOUNT_ID, bucket: DEPOSITO, accessKey: env.R2_ACCESS_KEY_ID, secretKey: env.R2_SECRET_ACCESS_KEY });
    return {
      existe: (clave) => r2.existe(clave),
      guardar: async (clave, bytes) => { await r2.guardar(clave, bytes, 'image/jpeg'); },
    };
  }
  // Sin claves de S3: wrangler con el mismo token de siempre (copiar-fotos.mjs lo usa igual).
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'copias-'));
  return {
    existe: async () => false, // wrangler no mira si existe; `put` pisa con lo mismo (la huella es el contenido)
    guardar: async (clave, bytes) => {
      const archivo = path.join(tmp, clave.replace(/[^A-Za-z0-9.-]/g, '_'));
      fs.writeFileSync(archivo, bytes);
      const r = await correrWrangler(['r2', 'object', 'put', `${DEPOSITO}/${clave}`, '--file', archivo, '--content-type', 'image/jpeg', '--cache-control', 'public, max-age=31536000, immutable', '--remote']);
      fs.rmSync(archivo, { force: true });
      if (!r.ok) throw new Error(`r2-${r.salida.split('\n').slice(-1)[0].trim().slice(0, 80)}`);
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const numero = (nombre, def) => { const a = args.find((x) => x.startsWith(`--${nombre}=`)); const n = a ? Number(a.split('=')[1]) : NaN; return Number.isFinite(n) && n > 0 ? Math.floor(n) : def; };
  const simular = args.includes('--simular');
  const forzar = args.includes('--forzar-reintentos');
  const env = process.env;
  if (!hayCredenciales(env)) { console.error('Faltan CLOUDFLARE_API_TOKEN y CLOUDFLARE_ACCOUNT_ID.'); process.exit(1); }
  const d1 = clienteD1({ cuenta: env.CLOUDFLARE_ACCOUNT_ID, token: env.CLOUDFLARE_API_TOKEN });
  const ffmpeg = (await import('ffmpeg-static')).default;
  const deposito = simular ? null : await depositoR2(env);
  const copiar = (url) => copiarUnaFoto(url, { fetchFn: fetch, convertir: (b, ancho) => aJpeg(b, ancho, ffmpeg), existe: deposito.existe, guardar: deposito.guardar });
  const informe = await correr({ d1, copiar, tope: numero('tope', TOPE_POR_CORRIDA), lectura: numero('lectura', NOTAS_A_LEER), simular, forzar, log: (t) => console.log(t) });

  const salida = env.INFORME_FOTOS || path.join(path.dirname(fileURLToPath(import.meta.url)), 'salida', 'fotos-copia.json');
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  fs.writeFileSync(salida, JSON.stringify({ cuando: new Date().toISOString(), ...informe }, null, 2));
  const resumen = `${simular ? 'Se copiarían' : 'Copiadas'}: ${informe.copiadas.length}. Falladas: ${informe.falladas.length}. Pendientes que había: ${informe.pendientes}.`;
  console.log(resumen);
  if (informe.falladas.length) {
    const porMotivo = {};
    for (const f of informe.falladas) porMotivo[f.motivo] = (porMotivo[f.motivo] || 0) + 1;
    console.log(`Motivos: ${Object.entries(porMotivo).map(([m, n]) => `${m} ×${n}`).join(', ')}`);
  }
  if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, `### Fotos propias\n${resumen}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
