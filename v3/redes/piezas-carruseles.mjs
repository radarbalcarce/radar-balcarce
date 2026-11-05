// Qué notas cuentan los carruseles de redes (Radar 3.0, 5/11) y con qué fotos. Corre en el Worker `radar-redes` junto con el plan de las piezas (piezas-plan.mjs). Puro salvo las funciones
// que leen la base. NO dibuja ni publica: eso lo hace v3/redes/piezas/correr.mjs en GitHub Actions. Reglas en palabras de persona: REGLAS.md, «Los carruseles».
//
//   «La semana en Balcarce» (domingos 11:00)  notas de Balcarce de los últimos 7 días: las más contadas por los medios y, si empatan, las más nuevas (5 a 8, sin repetir tema).
//   «El finde en Balcarce» (jueves 18:00)     la agenda: la mira el programa (como la pieza `agenda`) y avisa con `conDatos`.
//   El carrusel de una nota propia            nota de la redacción con 3 fotos o más (con dirección pública), una sola vez por nota.

import { diaDeBalcarce, motivoDeExclusion, tipoDeNota, tieneFoto, mismoTema, REGLAS as REGLAS_DE_NOTAS } from './elegir.mjs';
import { esTragediaParaRedes } from './tono.mjs';
import { notasParaRedes } from './db.mjs';
import * as dbp from './piezas-db.mjs';
import { SEMANA } from './piezas/variables.mjs';

/** Cuántas fotos pide un carrusel de nota propia y cuánto tiempo después de publicada todavía sale. */
export const CARRUSEL_DE_NOTA = Object.freeze({ fotosMin: 3, fotosMax: 10, horasDespuesDePublicada: 72 });

const aFoto = (f, i) => ({ url: String(f.url ?? f.copia ?? ''), credito: f.credito ?? '', epigrafe: f.epigrafe ?? f.leyenda ?? f.alt ?? '', ancho: f.ancho ?? null, alto: f.alto ?? null, orden: i });
const esHttps = (u) => /^https:\/\//i.test(String(u ?? ''));

/** Las fotos de una nota propia con dirección pública (https), sin repetir, en orden. Las que están sólo en el depósito del sitio, sin dirección (`r2`), no entran. */
export function fotosDeLaNota(nota) {
  const vistas = new Set();
  const salida = [];
  for (const f of nota?.fotos ?? []) {
    const url = f?.url ?? f?.copia;
    if (!esHttps(url) || vistas.has(url)) continue;
    vistas.add(url);
    salida.push(aFoto(f, salida.length));
  }
  return salida.slice(0, CARRUSEL_DE_NOTA.fotosMax);
}

/** La nota propia como la necesita `armarCarrusel`: portada, fotos y firma. */
export const notaParaElCarrusel = (n) => ({ id: n.id, slug: n.slug, titulo: n.titulo, seccion: n.seccion || 'Balcarce', firma: n.firma ? n.firma.replace(/^(por|revisad[ao] por)\s+/i, '') : undefined, fotos: fotosDeLaNota(n) });

/**
 * Las notas propias que hoy pueden tener su carrusel: con 3 fotos o más, de servicio no, sin tono triste (R41), publicadas hace menos de 72 horas y que su autor no haya dejado «sólo la web»
 * a propósito (la elección por defecto, sin confirmar, no cuenta: la regla de Hernán es que sale todo lo que se genere). Las más nuevas primero.
 */
export function propiasConCarrusel(notas, { ahora }) {
  const limite = new Date(ahora).getTime() - CARRUSEL_DE_NOTA.horasDespuesDePublicada * 3600_000;
  return notas.filter((n) => !n.deServicio && n.titulo
    && new Date(n.publicada).getTime() >= limite
    && !(n.redes?.confirmada === true && n.redes?.eleccion === 'solo-web')
    && !esTragediaParaRedes({ titulo: n.titulo, bajada: n.bajada })
    && fotosDeLaNota(n).length >= CARRUSEL_DE_NOTA.fotosMin)
    .sort((a, b) => String(b.publicada).localeCompare(String(a.publicada)));
}

/**
 * Las notas de «La semana en Balcarce»: sólo las de Balcarce de los últimos 7 días que pasan la misma compuerta que los repasos (ley, servicio, cotización, tono R41), las más contadas por
 * los medios primero y, a igualdad, las más nuevas; sin dos del mismo tema. Una nota de Balcarce sin foto entra igual (va con la placa de su sección). Con menos de 5 no hay carrusel: devuelve [].
 */
export function notasDeLaSemana(notas, { ahora, reglas = SEMANA } = {}) {
  const regla = { ...REGLAS_DE_NOTAS, edadMaximaHoras: reglas.edadMaximaHoras };
  const validas = notas.filter((n) => tipoDeNota(n) === 'local' && !motivoDeExclusion(tieneFoto(n) ? n : { ...n, foto: { url: 'https://placa.local/sin-foto' } }, { ahora, reglas: regla }))
    .sort((a, b) => (b.medios - a.medios) || String(b.publicada).localeCompare(String(a.publicada)));
  const elegidas = [];
  for (const n of validas) {
    if (elegidas.length >= reglas.notasMax) break;
    if (elegidas.some((e) => mismoTema(e.titulo, n.titulo))) continue;
    elegidas.push(n);
  }
  return elegidas.length >= reglas.notasMin ? elegidas : [];
}

const fotoParaLamina = (n) => (n.foto?.url ? { url: n.foto.url, credito: n.foto.credito ?? '', alt: n.titulo, ancho: n.foto.ancho, alto: n.foto.alto } : null);

/** Los datos de «La semana en Balcarce» para el programa que dibuja: las notas en orden (de más a menos importante) y desde/hasta (AAAA-MM-DD de Balcarce). Devuelve null si no hay 5 notas. */
export async function datosDeLaSemana(env, { ahora, simulado }) {
  const notas = await notasParaRedes(env, { desdeISO: new Date(new Date(ahora).getTime() - SEMANA.dias * 24 * 3600_000).toISOString(), conBorradores: simulado });
  const elegidas = notasDeLaSemana(notas, { ahora });
  if (!elegidas.length) return null;
  return {
    notas: elegidas.map((n) => ({ id: n.id, slug: n.slug, titulo: n.titulo, seccion: n.seccion, foto: fotoParaLamina(n) })),
    desde: diaDeBalcarce(new Date(new Date(ahora).getTime() - (SEMANA.dias - 1) * 24 * 3600_000)),
    hasta: diaDeBalcarce(ahora),
  };
}

/**
 * La nota propia que sigue para un carrusel (una sola vez por nota: si ya hay una fila de esa nota, en cualquier día, no se repite). Devuelve { pieza, nota } o null.
 * El id de la pieza es `carrusel-nota-<id de la nota>`.
 */
export async function proximaNotaConCarrusel(env, { ahora, simulado }) {
  const notas = await dbp.notasPropiasParaCarrusel(env, { desdeISO: new Date(new Date(ahora).getTime() - CARRUSEL_DE_NOTA.horasDespuesDePublicada * 3600_000).toISOString() });
  for (const n of propiasConCarrusel(notas, { ahora })) {
    const pieza = `carrusel-nota-${n.id}`;
    if (!(await dbp.piezaYaSalio(env, pieza, simulado)) && (await dbp.intentosFallidosDe(env, pieza, simulado)) < 3) return { pieza, nota: notaParaElCarrusel(n) };
  }
  return null;
}
