// El contador de audios del día (17/10/2026, regla 208). La voz de las piezas es gratis con un cupo de 10 audios por día y hasta acá el
// código no los contaba: se enteraba cuando Google contestaba "sin cupo" (429) y la pieza que tocaba, a veces el repaso de la noche, se
// caía. Cada pedido a Gemini es un audio del cupo, también los reintentos (audio vacío, error del servicio, "habló de más").
//
// Ahora:
//   · Cada pedido se anota ANTES de hacerlo, en la memoria de voces (la carpeta VOZ_CACHE, que en GitHub guarda la caché de Actions
//     entre corridas): `cupo-<día>.json`. El día es el de Google, que renueva el cupo a la medianoche de California (en Balcarce, a las
//     4 o 5 de la mañana: antes de la primera pieza, así que en la práctica es el día de Balcarce).
//   · Antes de pedir, se mira cuántos quedan y cuántos hay que GUARDAR para las piezas más importantes que todavía faltan hoy: el repaso
//     antes que el clima y la farmacia, ésos antes que la efeméride y el feriado, y todos antes que lo opcional (participá, los útiles,
//     la agenda). Si pedir dejaría sin voz a una más importante, la pieza no se arma (nunca con otra voz) y queda dicho por qué.
//   · Si Google contesta que se acabó el cupo del día, el contador se pone en el tope: nadie vuelve a pedir hoy.
//   · Al 80 % (8 de 10) avisa.
//
// Sin VOZ_CACHE (una prueba, la PC) no hay contador, como no hay memoria de voces: todo anda como antes. Sin dependencias.

import fs from 'node:fs';
import path from 'node:path';

/** El cupo de la clave de voces: 10 por día con la gratis (CLAUDE.md, "Cupo de voz: 10 audios por día"). 25/10/2026: con la clave paga se sube
 *  con la variable de GitHub `AUDIOS_POR_DIA`, sin tocar código (llega por redes-piezas.yml). */
export const AUDIOS_POR_DIA = Number(process.env.AUDIOS_POR_DIA) > 0 ? Math.floor(Number(process.env.AUDIOS_POR_DIA)) : 10;
/** Desde cuántos usados se avisa (el 80 %). */
export const AVISO_DESDE = Math.ceil(AUDIOS_POR_DIA * 0.8);

/**
 * Qué tan importante es cada pieza (1 es lo que más). Lo que no está en la lista es opcional (4). Los avisos de clima van con el clima.
 * El reparto lo pidieron Hernán y Andrés: el repaso es la pieza principal del día.
 */
export const PRIORIDAD = {
  noticia1: 1, noticia2: 1, podcast: 1,
  'clima-manana': 2, 'clima-noche': 2, farmacia: 2,
  efemeride: 3, feriado: 3,
};
export const prioridadDe = (nombre) => PRIORIDAD[nombre] ?? (String(nombre ?? '').startsWith('aviso-') ? 2 : 4);

/** El día del cupo de Google (AAAA-MM-DD en la hora de California). */
export function diaDelCupo(ahora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora);
}

const carpetaDe = (o = {}) => o.carpeta ?? process.env.VOZ_CACHE;
const archivoDe = (carpeta, dia) => path.join(carpeta, `cupo-${dia}.json`);

/** Lo anotado del día: { dia, usados, agotado, pedidos: [{ pieza, cuando }] }. */
export function leerCupo({ carpeta = process.env.VOZ_CACHE, ahora = new Date() } = {}) {
  const dia = diaDelCupo(ahora);
  const vacio = { dia, usados: 0, agotado: false, pedidos: [] };
  if (!carpeta) return vacio;
  try {
    const j = JSON.parse(fs.readFileSync(archivoDe(carpeta, dia), 'utf8'));
    return j?.dia === dia ? { ...vacio, ...j } : vacio;
  } catch { return vacio; }
}

function guardarCupo(estado, carpeta) {
  if (!carpeta) return;
  try {
    fs.mkdirSync(carpeta, { recursive: true });
    fs.writeFileSync(archivoDe(carpeta, estado.dia), JSON.stringify(estado));
  } catch { /* sin memoria, el contador no frena una pieza */ }
}

/** Cuántos audios quedan hoy. */
export function quedan(opciones = {}) {
  if (!carpetaDe(opciones)) return AUDIOS_POR_DIA;
  const c = leerCupo(opciones);
  return c.agotado ? 0 : Math.max(0, AUDIOS_POR_DIA - c.usados);
}

/** Anota un pedido a Gemini (antes de hacerlo: un pedido que se corta igual puede haber contado). Devuelve el estado nuevo. */
export function anotarPedido(pieza, { carpeta = process.env.VOZ_CACHE, ahora = new Date() } = {}) {
  const c = leerCupo({ carpeta, ahora });
  const nuevo = { ...c, usados: c.usados + 1, pedidos: [...c.pedidos, { pieza: pieza ?? null, cuando: ahora.toISOString() }].slice(-40) };
  guardarCupo(nuevo, carpeta);
  return nuevo;
}

/** Google dijo que se acabó el cupo del día: el contador queda en el tope. */
export function marcarAgotado({ carpeta = process.env.VOZ_CACHE, ahora = new Date() } = {}) {
  const c = leerCupo({ carpeta, ahora });
  const nuevo = { ...c, usados: Math.max(c.usados, AUDIOS_POR_DIA), agotado: true };
  guardarCupo(nuevo, carpeta);
  return nuevo;
}

/** El error de "no se pide": la pieza no sale en esta vuelta, sin otra voz (CRITERIO-REDES.md § 2). */
export class SinCupoDeVoz extends Error {
  constructor(mensaje) { super(mensaje); this.name = 'SinCupoDeVoz'; this.sinCupo = true; }
}

/**
 * ¿Se puede pedir un audio para `pieza`, guardando `reservar` para las más importantes? Devuelve null si sí, o el motivo si no.
 */
export function motivoParaNoPedir({ pieza = null, reservar = 0, ...opciones } = {}) {
  const q = quedan(opciones);
  if (q <= 0) return `se acabó el cupo de voz de hoy (${AUDIOS_POR_DIA} audios)`;
  if (q <= reservar) return `quedan ${q} audio(s) de voz y se guardan para ${reservar === 1 ? 'una pieza más importante' : `${reservar} piezas más importantes`} que faltan hoy${pieza ? ` (${pieza} espera)` : ''}`;
  return null;
}

/**
 * Cuántos audios hay que guardar para las piezas MÁS importantes que `nombre` que todavía faltan hoy. `pendientes` son los nombres de las
 * piezas del día que todavía no salieron y siguen a tiempo (incluida la que se está armando, que no cuenta).
 */
export function reservaPara(nombre, pendientes = []) {
  const p = prioridadDe(nombre);
  return [...new Set(pendientes)].filter((x) => x !== nombre && prioridadDe(x) < p).length;
}

/** Ordena las piezas que se arman juntas: primero la más importante (así, si el cupo no alcanza, la que queda afuera es la opcional). */
export const porPrioridad = (a, b) => prioridadDe(a.nombre) - prioridadDe(b.nombre);

/** La línea del contador para la corrida: "voz: 6 de 10 audios usados hoy, quedan 4". */
export function textoDelCupo(opciones = {}) {
  const c = leerCupo(opciones);
  const q = quedan(opciones);
  return `voz: ${Math.min(c.usados, AUDIOS_POR_DIA)} de ${AUDIOS_POR_DIA} audios usados hoy (día de Google ${c.dia}), quedan ${q}${c.agotado ? ' · Google dijo que se acabó' : ''}`;
}

/** ¿Hay que avisar? (8 de 10 o más). */
export const hayQueAvisar = (opciones = {}) => leerCupo(opciones).usados >= AVISO_DESDE;
