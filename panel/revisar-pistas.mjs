// Vuelve a mirar las pistas que quedaron abiertas (2/10/2026, Hernán: "que quede abierta la investigación y ver si aparece en algún medio").
//
//   node panel/revisar-pistas.mjs                 mira todas las abiertas (cada tres horas, .github/workflows/pistas.yml)
//   node panel/revisar-pistas.mjs --id=pista1a2b  mira sólo esa (el botón "Volver a mirar" del panel)
//   node panel/revisar-pistas.mjs --simular       muestra qué pasaría, sin escribir ni avisar
//
// Por cada pista abierta repite las mismas búsquedas en Google Noticias (sólo cuenta quién la cubrió y cuándo, no copia texto) y mira si
// ya la tenemos nosotros. Si la cobertura subió de nivel (de "sin cobertura" a "un medio", a "cubierta"…) o ya la publicamos, marca la
// novedad en web/data/pistas.json (el informe nuevo viaja cifrado para el celular) y avisa por WhatsApp, sin el texto de la pista.
// Sin dependencias.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { leerJson } from '../ingesta/json.mjs';
import { revisarPista } from '../ingesta/pistas.mjs';
import { cerrar, leerLlaves } from './cifrado.mjs';
import { conRevision, pistasParaRevisar, comoRenglones, avisoDePistas, PISTAS_ABIERTAS } from './pistas-libro.mjs';
import { leerVariable, claveRedaccion, claveClasificacion } from '../reels/claves.mjs';
import { sacarPistasSolas } from './pistas-solas.mjs';
import { avisar } from '../redes/avisar-por-mail.mjs';
import { raizDelProyecto } from '../redes/raiz.mjs';

// Los archivos que lee y escribe, relativos a la carpeta del proyecto (el corredor de tareas de Cloudflare los baja y los guarda: infra/tareas-cloudflare/).
export const ARCHIVOS_QUE_LEE = ['web/data/pistas.json', 'web/data/celular-llaves.json', 'web/data/portada.json', 'web/data/archivo.json', 'web/data/notas-de-pistas.json'];
export const ARCHIVOS_QUE_ESCRIBE = ['web/data/pistas.json', 'web/data/notas-de-pistas.json', 'web/data/uso-ia.json'];
/** Dónde está pistas.json en una carpeta de proyecto. */
export const archivoDePistas = (raiz) => path.join(raiz, 'web', 'data', 'pistas.json');

/**
 * Una pasada entera, sin leer ni escribir nada (para probarla). Devuelve { libro, novedades, revisadas }.
 * `solo`: el id de una sola pista (se mira aunque no toque), o null.
 */
export async function pasadaDePistas({
  libro = { pistas: {} }, llaves = [], notas = [], clave = null, fetchFn = fetch, buscar, ahora = new Date(), solo = null,
} = {}) {
  let actual = libro;
  const novedades = [];
  const revisadas = [];
  const ids = solo ? [solo].filter((id) => libro.pistas?.[id]) : pistasParaRevisar(libro, ahora);
  for (const id of ids) {
    const pista = actual.pistas[id];
    const r = await revisarPista(pista, { clave, fetchFn, notas, ahora, ...(buscar ? { buscar } : {}) });
    const sobre = r.novedad || r.informe.total !== pista.total ? cerrar({ id, tipo: 'pista', ...r.informe }, llaves) : null;
    actual = conRevision(actual, id, { informe: r.informe, sobre, novedad: r.novedad, motivo: r.motivo, ahora });
    revisadas.push(id);
    if (r.novedad) novedades.push({ id, afirmacion: pista.afirmacion, motivo: r.motivo });
  }
  return { libro: actual, novedades, revisadas };
}

/** Una pasada de las pistas. `argv`, `env` y `raiz` entran por parámetro para correr igual en la terminal, en GitHub y en un Worker (sin `process.exit`). */
export async function main({ argv = process.argv.slice(2), env: entorno = process.env, raiz = null } = {}) {
  const RAIZ = raiz ?? raizDelProyecto(entorno, import.meta.dirname);
  const DATOS = path.join(RAIZ, 'web', 'data');
  const ARCHIVO_PISTAS = archivoDePistas(RAIZ);
  const simular = argv.includes('--simular');
  const solo = (argv.find((a) => a.startsWith('--id=')) ?? '').slice(5) || null;
  const libro = leerJson(ARCHIVO_PISTAS, { pistas: {} });
  const llaves = leerLlaves(leerJson(path.join(DATOS, 'celular-llaves.json'), null));
  if (!Object.keys(libro.pistas ?? {}).length) { console.log('No hay pistas abiertas.'); return; }
  if (!llaves.length) { console.log('No hay ningún celular registrado: no hay a quién mandarle el informe.'); return; }
  const notas = [...(leerJson(path.join(DATOS, 'portada.json'), null)?.notas ?? []), ...(leerJson(path.join(DATOS, 'archivo.json'), null)?.notas ?? [])];
  const r = await pasadaDePistas({ libro, llaves, notas, clave: claveRedaccion({ env: entorno }) ?? claveClasificacion({ env: entorno }), solo });
  console.log(`Pistas: ${r.revisadas.length} revisadas, ${r.novedades.length} con novedades (se siguen ${PISTAS_ABIERTAS.dias} días).`);
  for (const n of r.novedades) console.log(`  novedad (${n.id}): ${n.motivo}`);
  if (simular) return;
  // Las que ya cubren tres o más medios y pasan el verificador salen solas como notas propias (4/10, panel/pistas-solas.mjs).
  let libroFinal = r.libro;
  const novedadesDeSolas = [];
  if (!solo && entorno.TAVILY_API_KEY) {
    const archivoDeNotas = path.join(DATOS, 'notas-de-pistas.json');
    const s = await sacarPistasSolas({ libro: libroFinal, notas: leerJson(archivoDeNotas, { notas: {} }), archivo: leerJson(path.join(DATOS, 'archivo.json'), { notas: [] }).notas ?? [] });
    for (const x of s.intentadas) console.log(`  salir sola (${x.id}): no salió, ${x.motivo}`);
    if (s.salieron.length) {
      fs.writeFileSync(archivoDeNotas, `${JSON.stringify(s.notas, null, 1)}
`, 'utf8');
      libroFinal = s.libro;
      for (const id of s.salieron) { novedadesDeSolas.push({ id, afirmacion: libroFinal.pistas[id]?.afirmacion, motivo: 'salió sola como nota de Radar Balcarce' }); console.log(`  salió sola (${id})`); }
    }
  }
  fs.writeFileSync(ARCHIVO_PISTAS, comoRenglones(libroFinal), 'utf8');
  const texto = avisoDePistas([...r.novedades, ...novedadesDeSolas]);
  if (texto) {
    // Por mail (Worker de Cloudflare) y, si no sale, por WhatsApp (regla 173). `avisar` nunca tira.
    const env = Object.fromEntries(['VIGILANTE_TOKEN', 'AVISOS_URL', 'WHATSAPP_TELEFONO', 'WHATSAPP_APIKEY'].map((n) => [n, leerVariable(n, { env: entorno })]));
    const r = await avisar({ asunto: 'Pistas: novedades', texto, nivel: 'info' }, { env });
    if (!r.ok) console.log(`Aviso: no salió (${r.motivo})`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
