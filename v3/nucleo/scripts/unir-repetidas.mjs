// Unir las notas repetidas de la base D1 `radar-nucleo` (5/11/2026): detecta con criterio conservador, elige cuál queda y retira las demás con redirección 301 a la que quedó.
//
//   node v3/nucleo/scripts/unir-repetidas.mjs              (sin nada más es SIMULACIÓN) sólo imprime los pares (títulos, fechas, direcciones y cuál quedaría); no escribe nada en ningún lado
//   node v3/nucleo/scripts/unir-repetidas.mjs --real       respalda las filas afectadas en R2 (respaldos/repetidas/AAAA-MM-DD.json), controla que se pueda volver a leer y recién ahí hace los UPDATE
//
// Lo corre el workflow «Radar 3.0: unir repetidas» (a mano, `simular` por defecto en «sí»). Secretos que ya existen: CLOUDFLARE_API_TOKEN (con permiso de escribir en D1), CLOUDFLARE_ACCOUNT_ID,
// R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY. El respaldo NUNCA se sube como adjunto de la corrida (el repositorio es público): sólo al depósito privado.
// Sin IA. Ante la duda NO marca: una nota que no cumple todo lo que se pide queda como está.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugDe } from '../../sitio/util.mjs';
import { idDeLaBase, diaDeBalcarce, DEPOSITO_POR_DEFECTO } from './respaldo-d1.mjs';

export const DIAS_A_MIRAR = 45;
/** Palabras significativas en común (sobre el título que tiene MÁS palabras) para decir «casi igual». */
export const UMBRAL_DE_TITULO = 0.7;
/** Menos de esto no es un título con qué comparar. */
export const PALABRAS_MINIMAS = 4;
/** Lo repetido sale el mismo día o el siguiente: más separadas que esto, no se tocan (un título que vuelve cada semana no es una repetida). */
export const DIAS_DE_DISTANCIA = 1;
export const POR = 'Claude (5/11)';
export const CARPETA_DE_RESPALDOS = 'respaldos/repetidas/';
/** Para no tocar de más en una sola corrida: si la detección encuentra más que esto, algo anda raro y no se escribe nada. */
export const TOPE_DE_RETIROS = 60;

const PARADAS = new Set('para con una uno unos unas los las del por que como sus este esta estos estas pero sobre entre desde hasta tras ante segun sin mas muy ser son fue era hay han tiene tienen tras otro otra otros otras cada'.split(' '));

// ------------------------------------------------------------------ lo puro (sin red)

const json = (v) => { if (v == null) return null; if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch { return null; } };

/** Las palabras que cuentan de un título: sin tildes, en minúsculas, de 4 letras o más y sin las de relleno. */
export function palabrasDe(titulo) {
  const t = String(titulo ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  return new Set(t.split(' ').filter((p) => p.length >= 4 && !PARADAS.has(p) && !/^\d+$/.test(p)).map((p) => p.slice(0, 5))); // raíz de 5 letras: «gana» y «ganó» cuentan como la misma
}

/** Los números de un título (10, 12.5, 12,5…), ordenados. Si dos títulos tienen números distintos no son la misma noticia (otra fecha, otro resultado, otra cifra). */
export const numerosDe = (titulo) => (String(titulo ?? '').match(/\d+(?:[.,]\d+)?/g) ?? []).map((x) => x.replace(',', '.')).sort();
export const mismosNumeros = (a, b) => JSON.stringify(numerosDe(a)) === JSON.stringify(numerosDe(b));

const sinTildes = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
/** Plantillas de servicio que se repiten todos los días con otro contenido: clima, repasos, dólar, efemérides, farmacia, horarios. Nunca se unen, tengan o no `ficha.marca`. */
const SERVICIO_POR_TITULO = [
  /\bclima\b/, /\bpronostico\b/, /\bprobabilidad de (lluvia|tormenta)/, /\bminima de \d/, /\brepaso\b/, /\bdolar\b/, /\bcotizacion\b/, /\bun dia como hoy\b/, /\befemeride/,
  /\bfarmacias?\b/, /\bde turno\b/, /\bhorarios?\b/, /\bagenda\b/, /\bcartelera\b/,
];
export const esDeServicioPorTitulo = (titulo) => { const t = sinTildes(titulo); return SERVICIO_POR_TITULO.some((re) => re.test(t)); };

/** Qué parte de las palabras tienen en común dos títulos (sobre el que tiene más). 0 si alguno tiene muy pocas. */
export function parecidoDeTitulos(a, b) {
  const A = palabrasDe(a), B = palabrasDe(b);
  if (A.size < PALABRAS_MINIMAS || B.size < PALABRAS_MINIMAS) return 0;
  let comunes = 0;
  for (const p of A) if (B.has(p)) comunes++;
  return comunes / Math.max(A.size, B.size);
}

const urlsDe = (n) => new Set((json(n.fuentes) ?? []).map((f) => String(f?.url ?? '').replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase()).filter(Boolean));
export const fuenteEnComun = (a, b) => { const B = urlsDe(b); for (const u of urlsDe(a)) if (B.has(u)) return true; return false; };

/** ¿Tiene una foto de verdad (no vacía ni «null»)? */
export function tieneFoto(n) {
  const f = json(n.foto);
  if (!f) return false;
  if (Array.isArray(f)) return f.some((x) => x && (x.url || typeof x === 'string'));
  return Boolean(f.url || (Array.isArray(f.fotos) && f.fotos.length));
}

const slugDeNota = (n) => n.slug || slugDe(n.titulo);
const cuandoSalio = (n) => n.publicada_en || n.creada || '';
const diaDe = (n) => cuandoSalio(n).slice(0, 10);
const horasDeDistancia = (a, b) => Math.abs(Date.parse(cuandoSalio(a)) - Date.parse(cuandoSalio(b))) / 3600000;
const distanciaEnDias = (a, b) => Math.abs(Date.parse(`${diaDe(a)}T00:00:00Z`) - Date.parse(`${diaDe(b)}T00:00:00Z`)) / 86400000;

/** Las notas que nunca se unen: las de servicio (clima, dólar, media kit, repasos: llevan `ficha.marca`), las escritas por una persona y las que no tienen título. */
export function esUnible(n) {
  if (!n?.id || !n.titulo || !String(n.titulo).trim()) return false;
  if (n.id === 'mediakit' || /^clima-\d{4}-\d{2}-\d{2}$/.test(n.id)) return false;
  if (n.origen === 'redaccion') return false;
  if (esDeServicioPorTitulo(n.titulo)) return false;
  const ficha = json(n.ficha);
  if (ficha && typeof ficha === 'object' && ficha.marca) return false;
  return true;
}

/**
 * ¿Son la misma noticia? Devuelve el motivo (`direccion` o `titulo`) o null. Conservador: las dos tienen que ser unibles y salir el mismo día o el siguiente, y además
 * - la misma dirección sin el código final Y títulos con 70 % o más de palabras en común, o
 * - títulos con 70 % de palabras en común, la misma sección y una fuente (url) en común; y siempre: menos de 24 h entre una y otra, mismos números en el título y que no sea de servicio (clima, repasos, dólar…).
 */
export function sonRepetidas(a, b) {
  if (!esUnible(a) || !esUnible(b) || a.id === b.id) return null;
  if (distanciaEnDias(a, b) > DIAS_DE_DISTANCIA) return null;
  if (!(horasDeDistancia(a, b) < 24)) return null; // salen con menos de 24 horas de diferencia (y el mismo día o el siguiente)
  if (!mismosNumeros(a.titulo, b.titulo)) return null;
  const parecido = parecidoDeTitulos(a.titulo, b.titulo);
  const iguales = slugDe(a.titulo) === slugDe(b.titulo);
  // Misma dirección: además de eso, los títulos tienen que parecerse (el slug se corta y puede juntar títulos distintos).
  if (slugDeNota(a) === slugDeNota(b) && (iguales || parecido >= UMBRAL_DE_TITULO)) return 'direccion';
  // Título casi igual: misma sección Y una fuente (url) en común sí o sí.
  if (a.seccion && a.seccion === b.seccion && parecido >= UMBRAL_DE_TITULO && fuenteEnComun(a, b)) return 'titulo';
  return null;
}

/**
 * Arma los grupos. Cada nota nueva se compara sólo con la que quedó de cada grupo (nunca A-B y B-C encadenadas). Queda la que salió primero, salvo que ella no tenga
 * foto y la repetida sí: entonces queda la repetida (y la primera pasa a ser una más de las que se retiran).
 * Devuelve [{ queda, retirar: [{ nota, motivo }] }] sólo de los grupos con algo para retirar.
 */
export function agruparRepetidas(notas) {
  const orden = [...(notas ?? [])].filter(esUnible).sort((x, y) => (cuandoSalio(x) < cuandoSalio(y) ? -1 : cuandoSalio(x) > cuandoSalio(y) ? 1 : x.id < y.id ? -1 : 1));
  const grupos = [];
  for (const n of orden) {
    let puesta = false;
    for (const g of grupos) {
      const motivo = sonRepetidas(g.queda, n);
      if (!motivo) continue;
      if (!tieneFoto(g.queda) && tieneFoto(n)) {
        g.retirar.push({ nota: g.queda, motivo });
        g.queda = n;
      } else g.retirar.push({ nota: n, motivo });
      puesta = true;
      break;
    }
    if (!puesta) grupos.push({ queda: n, retirar: [] });
  }
  return grupos.filter((g) => g.retirar.length);
}

/** Lo que se guarda en `no_publicar` de la retirada. `destino` es el id de la nota que quedó (el sitio arma la dirección con él). */
export const noPublicarDe = (queda, motivoDeDeteccion, ahora = new Date()) => ({
  motivo: `repetida de ${queda.id}`,
  cuando: new Date(ahora).toISOString(),
  por: POR,
  destino: queda.id,
  deteccion: motivoDeDeteccion,
});

const dirDe = (n) => `/nota/${slugDeNota(n)}-${n.id}`;

/** El texto de la simulación (y del resumen del job): un bloque por grupo. */
export function informeEnTexto(grupos, { simulado = true, total = 0 } = {}) {
  const retiros = grupos.reduce((s, g) => s + g.retirar.length, 0);
  const l = [`${simulado ? 'SIMULACIÓN (no se tocó nada)' : 'CORRIDA REAL'}: ${total} notas publicadas revisadas, ${grupos.length} grupos de repetidas, ${retiros} para retirar.`, ''];
  grupos.forEach((g, i) => {
    l.push(`Grupo ${i + 1} (${g.queda.seccion ?? '?'})`);
    l.push(`  QUEDA   ${cuandoSalio(g.queda).slice(0, 16)}  ${tieneFoto(g.queda) ? 'con foto' : 'sin foto'}  ${g.queda.titulo}`);
    l.push(`          ${dirDe(g.queda)}`);
    for (const r of g.retirar) {
      l.push(`  RETIRA  ${cuandoSalio(r.nota).slice(0, 16)}  ${tieneFoto(r.nota) ? 'con foto' : 'sin foto'}  ${r.nota.titulo}  [por ${r.motivo === 'direccion' ? 'misma dirección' : 'título casi igual'}]`);
      l.push(`          ${dirDe(r.nota)}  →  ${dirDe(g.queda)}`);
    }
    l.push('');
  });
  return l.join('\n');
}

// ------------------------------------------------------------------ la corrida (con las dependencias que se le pasen)

/**
 * `deps`: { leerNotas(desdeISO) → filas, respaldar(filasCompletas) → clave, retirar(id, noPublicarObjeto) → void, ahora() }. Orden: detectar → (si no es simulación) respaldar y controlar → retirar.
 * Si el respaldo falla, no se retira nada. Si la detección encuentra más de TOPE_DE_RETIROS, se frena sin escribir.
 */
export async function correr(deps, { simular = true } = {}) {
  const ahora = deps.ahora ? deps.ahora() : new Date();
  const desde = new Date(ahora.getTime() - DIAS_A_MIRAR * 86400000).toISOString();
  const notas = await deps.leerNotas(desde);
  const grupos = agruparRepetidas(notas);
  const retiros = grupos.flatMap((g) => g.retirar.map((r) => ({ id: r.nota.id, queda: g.queda, motivo: r.motivo })));
  const base = { revisadas: notas.length, grupos, retiros: retiros.length, simulado: simular, respaldo: null, retiradas: [] };
  if (simular || !retiros.length) return base;
  if (retiros.length > TOPE_DE_RETIROS) throw new Error(`se encontraron ${retiros.length} notas para retirar (el tope es ${TOPE_DE_RETIROS}): algo cambió en el criterio o en los datos; no se escribe nada`);
  const clave = await deps.respaldar(retiros.map((r) => r.id));
  for (const r of retiros) {
    await deps.retirar(r.id, noPublicarDe(r.queda, r.motivo, ahora));
    base.retiradas.push(r.id);
  }
  return { ...base, respaldo: clave };
}

// ------------------------------------------------------------------ lo que habla con el mundo

/** Una consulta a D1 por la API REST de Cloudflare. Devuelve las filas (o [] si es un UPDATE). */
export async function consultarD1({ uuid, sql, params = [], env = process.env, fetchFn = fetch }) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${uuid}/query`;
  let r;
  try { r = await fetchFn(url, { method: 'POST', headers: { authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, 'content-type': 'application/json' }, body: JSON.stringify({ sql, params }), signal: AbortSignal.timeout(60000) }); } catch { throw new Error('Cloudflare no contestó a la consulta de D1'); }
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.success) throw new Error(`D1 contestó ${r.status}: ${String(j?.errors?.[0]?.message ?? '').slice(0, 160)} (¿el token puede escribir en D1?)`);
  return j.result?.[0]?.results ?? [];
}

const SELECT_NOTAS = `SELECT n.id, n.historia_id, n.creada, n.titulo, n.seccion, n.foto, n.fuentes, n.ficha, s.slug AS slug, s.publicada_en AS publicada_en, s.origen AS origen
  FROM notas n LEFT JOIN sitio_notas s ON s.id = n.id
  WHERE n.estado = 'publicada' AND COALESCE(s.publicada_en, n.creada) >= ?`;

/** Las dependencias de verdad: la API de D1 y el cliente S3 de R2 (infra/compartido/r2-s3.mjs). */
export async function depsDeVerdad(env = process.env, { simular = true } = {}) {
  const faltan = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', ...(simular ? [] : ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'])].filter((v) => !env[v]);
  if (faltan.length) throw new Error(`Falta el secreto ${faltan.join(', ')} (lo pega una persona en GitHub → Settings → Secrets).`);
  const uuid = await idDeLaBase('radar-nucleo', { env });
  const q = (sql, params) => consultarD1({ uuid, sql, params, env });
  return {
    leerNotas: (desde) => q(SELECT_NOTAS, [desde]),
    respaldar: async (ids) => {
      const { clienteR2 } = await import('../../../infra/compartido/r2-s3.mjs');
      const r2 = clienteR2({ cuenta: env.CLOUDFLARE_ACCOUNT_ID, bucket: env.R2_RESPALDOS || DEPOSITO_POR_DEFECTO, accessKey: env.R2_ACCESS_KEY_ID, secretKey: env.R2_SECRET_ACCESS_KEY });
      const marcas = ids.map(() => '?').join(',');
      const notas = await q(`SELECT * FROM notas WHERE id IN (${marcas})`, ids);
      const sitio = await q(`SELECT * FROM sitio_notas WHERE id IN (${marcas})`, ids);
      if (notas.length !== ids.length) throw new Error(`el respaldo trajo ${notas.length} filas y se iban a retirar ${ids.length}; no se escribe nada`);
      const cuerpo = Buffer.from(JSON.stringify({ hecho: new Date().toISOString(), por: POR, notas, sitio_notas: sitio }));
      const hoy = diaDeBalcarce(new Date());
      let clave = `${CARPETA_DE_RESPALDOS}${hoy}.json`;
      if (await r2.existe(clave)) clave = `${CARPETA_DE_RESPALDOS}${hoy}-${new Date().toISOString().slice(11, 16).replace(':', '')}.json`;
      await r2.guardar(clave, cuerpo, 'application/json');
      const vuelta = await r2.leer(clave);
      if (!vuelta || Buffer.compare(Buffer.from(vuelta), cuerpo) !== 0) throw new Error('lo que quedó en el depósito no coincide con el respaldo; no se retira nada');
      return clave;
    },
    retirar: (id, noPublicar) => q("UPDATE notas SET estado = 'retirada', no_publicar = ? WHERE id = ? AND estado = 'publicada'", [JSON.stringify(noPublicar), id]),
    ahora: () => new Date(),
  };
}

async function principal() {
  const simular = !process.argv.includes('--real');
  const ocultar = (t) => [process.env.CLOUDFLARE_API_TOKEN, process.env.R2_SECRET_ACCESS_KEY, process.env.R2_ACCESS_KEY_ID].filter(Boolean).reduce((x, s) => x.split(s).join('***'), String(t));
  try {
    const r = await correr(await depsDeVerdad(process.env, { simular }), { simular });
    const texto = informeEnTexto(r.grupos, { simulado: r.simulado, total: r.revisadas })
      + (r.simulado ? '' : `\nRespaldo: ${r.respaldo ?? '(nada que retirar)'}\nRetiradas: ${r.retiradas.length}\n`);
    console.log(texto);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Unir repetidas\n\n\`\`\`\n${texto}\n\`\`\`\n`);
  } catch (e) {
    console.error(`UNIR REPETIDAS FALLÓ: ${ocultar(e?.message ?? e)}`);
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await principal();
