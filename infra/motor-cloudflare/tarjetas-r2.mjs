// Después de compilar: sube a R2 las tarjetas que se dibujaron de nuevo, anota cuáles se pidieron hoy y borra las que nadie pidió (24/10/2026, regla 311).
//
// La parte de LEER (mientras se compila) está en infra/compartido/tarjetas-r2.mjs; el porqué y los números, en
// docs/etapa-10-operacion/MINUTOS-DE-WORKERS-BUILDS.md. En Workers Builds la carpeta `.cache/tarjetas/` arranca vacía en cada vuelta, así que al
// terminar de compilar lo que hay ahí es EXACTAMENTE lo que esa compilación pidió: las que bajó de R2 (ya estaban) y las que dibujó de nuevo (hay que
// subirlas). El índice (`motor/tarjetas-indice.json`) guarda el último día que se pidió cada huella, y con eso se poda: pasados DIAS_EN_R2 días sin
// pedirse, o pasado el TOPE_EN_R2 de imágenes, se borran (las más viejas primero).
//
// Nunca frena la vuelta: un fallo de R2 se cuenta y se sigue. Sólo Node (usa el disco); la parte de R2 recibe el cliente por parámetro.

import fs from 'node:fs';
import path from 'node:path';
import {
  PREFIJO_EN_R2, CLAVE_DEL_INDICE, DIAS_EN_R2, TOPE_EN_R2, claveEnR2, huellaDeLaClave,
} from '../compartido/tarjetas-r2.mjs';

/** "2026-10-24" en hora de Balcarce. */
export const diaDe = (fecha) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(fecha);

/** Las huellas de los PNG que hay en la carpeta (los `.tmp` de una escritura a medias no cuentan). Con `desde` (ms), sólo los tocados desde entonces. */
export function tarjetasDeLaCarpeta(carpeta, { desde = 0 } = {}) {
  let nombres = [];
  try { nombres = fs.readdirSync(carpeta); } catch { return []; }
  const huellas = [];
  for (const n of nombres) {
    if (!/^[0-9a-f]{40}\.png$/.test(n)) continue;
    try { if (fs.statSync(path.join(carpeta, n)).mtimeMs >= desde) huellas.push(n.slice(0, -4)); } catch { /* se ignora */ }
  }
  return huellas.sort();
}

/** Corre `tareas` (funciones async) de a `en` por vez. */
async function enParalelo(tareas, en = 8) {
  const salida = [];
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(en, tareas.length) }, async () => {
    while (i < tareas.length) { const mia = i; i += 1; salida[mia] = await tareas[mia](); }
  }));
  return salida;
}

/**
 * Deja R2 al día con lo que pidió esta compilación. Devuelve { pedidas, subidas, fallidas, borradas, enR2, huerfanas, indiceGuardado, pendientes }.
 * `limiteSegundos`: si subir tarda más, lo que falta queda para la vuelta siguiente (se vuelve a dibujar, pero la vuelta no se atrasa).
 */
export async function sincronizarTarjetas(r2, carpeta, {
  ahora = new Date(), desde = 0, dias = DIAS_EN_R2, tope = TOPE_EN_R2, limiteSegundos = 150, reloj = () => Date.now(), log = () => {},
} = {}) {
  const hoy = diaDe(ahora);
  const limiteDeEdad = diaDe(new Date(ahora.getTime() - dias * 86400 * 1000));
  const pedidas = tarjetasDeLaCarpeta(carpeta, { desde });
  let indice = {};
  try { const t = await r2.leerTexto(CLAVE_DEL_INDICE); const j = t ? JSON.parse(t) : {}; if (j && typeof j === 'object' && !Array.isArray(j)) indice = j; } catch { indice = {}; }
  const enR2 = new Set((await r2.listar(PREFIJO_EN_R2)).map(huellaDeLaClave).filter((h) => /^[0-9a-f]{40}$/.test(h)));
  let cambio = false;
  // Lo que está en R2 y el índice no conoce (el índice se perdió, o una subida se cortó antes de anotarse): empieza a contar desde hoy.
  let huerfanas = 0;
  for (const h of enR2) if (!indice[h]) { indice[h] = hoy; cambio = true; huerfanas += 1; }
  // Lo que el índice dice que está y R2 no tiene: se saca del índice.
  for (const h of Object.keys(indice)) if (!enR2.has(h)) { delete indice[h]; cambio = true; }

  const inicio = reloj();
  const subidas = [];
  const fallidas = [];
  let pendientes = 0;
  const nuevas = pedidas.filter((h) => !enR2.has(h));
  await enParalelo(nuevas.map((h) => async () => {
    if ((reloj() - inicio) / 1000 > limiteSegundos) { pendientes += 1; return; }
    try {
      await r2.guardar(claveEnR2(h), new Uint8Array(fs.readFileSync(path.join(carpeta, `${h}.png`))), 'image/png');
      subidas.push(h); enR2.add(h); indice[h] = hoy; cambio = true;
    } catch (e) { fallidas.push({ huella: h, error: String(e?.message ?? e).slice(0, 120) }); }
  }));
  // Lo pedido hoy que ya estaba: se anota el día (una sola escritura del índice por día y por novedad).
  for (const h of pedidas) if (enR2.has(h) && indice[h] !== hoy) { indice[h] = hoy; cambio = true; }

  // La poda: lo que nadie pidió en `dias` días, y después, si todavía son más que el tope, lo menos reciente.
  const aBorrar = new Set(Object.keys(indice).filter((h) => indice[h] < limiteDeEdad));
  const quedan = Object.keys(indice).filter((h) => !aBorrar.has(h)).sort((a, b) => (indice[a] === indice[b] ? (a < b ? -1 : 1) : (indice[a] < indice[b] ? -1 : 1)));
  for (const h of quedan.slice(0, Math.max(0, quedan.length - tope))) aBorrar.add(h);
  const borradas = [];
  for (const h of aBorrar) {
    try { await r2.borrar(claveEnR2(h)); delete indice[h]; enR2.delete(h); borradas.push(h); cambio = true; } catch (e) { log(`(no se pudo borrar ${h.slice(0, 8)}: ${String(e?.message ?? e).slice(0, 80)})`); }
  }

  let indiceGuardado = false;
  if (cambio) {
    try { await r2.guardar(CLAVE_DEL_INDICE, JSON.stringify(indice), 'application/json'); indiceGuardado = true; } catch (e) { log(`(no se pudo guardar el índice de tarjetas: ${String(e?.message ?? e).slice(0, 80)})`); }
  }
  return { pedidas: pedidas.length, subidas: subidas.length, fallidas: fallidas.length, borradas: borradas.length, enR2: enR2.size, huerfanas, pendientes, indiceGuardado };
}
