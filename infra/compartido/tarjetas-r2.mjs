// La memoria de las tarjetas de las notas, en R2 (24/10/2026, regla 311; ver docs/etapa-10-operacion/MINUTOS-DE-WORKERS-BUILDS.md).
//
// La regla 305 hizo que la compilación no dibuje de nuevo una imagen que no cambió: la guarda en `.cache/tarjetas/<huella>.png`. En la PC y en
// GitHub Actions esa carpeta sobrevive entre vueltas. En Workers Builds NO: cada vuelta arranca en una máquina nueva, así que la memoria no
// servía de nada y se dibujaban las ~1.000 imágenes (dos por nota) en cada vuelta. Acá se la lleva a R2, pero NO como un paquete que se
// baja entero (son ~300 MB): cada imagen es un objeto suelto con su huella en el nombre.
//
//   motor/tarjetas/<huella>.png      la imagen (un PNG de ~0,5 MB)
//   motor/tarjetas-indice.json       { huella: "AAAA-MM-DD" } el último día que se pidió cada una (para podar)
//
// Dos partes:
//   1. LEER, mientras se compila (este archivo): cuando la compilación necesita una imagen y no está en el disco, pregunta por ESA huella a R2.
//      Baja sólo lo que pide. Si R2 tarda, falla o no la tiene, se dibuja como siempre: la memoria nunca frena la compilación.
//   2. GUARDAR y PODAR, después de compilar (infra/motor-cloudflare/tarjetas-r2.mjs): sube las que se dibujaron de nuevo y borra las que nadie pidió
//      en DIAS_EN_R2 días o las que sobran del tope.
//
// Apagado por defecto: sólo con TARJETAS_EN_R2="Si" y las claves de R2 del motor (R2_MOTOR, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY y
// CLOUDFLARE_ACCOUNT_ID). Sin dependencias; el mismo archivo lo usan la compilación de Next (web/lib/tarjeta.js) y la vuelta del motor.

import { clienteR2 } from './r2-s3.mjs';

export const PREFIJO_EN_R2 = 'motor/tarjetas/';
export const CLAVE_DEL_INDICE = 'motor/tarjetas-indice.json';
/** Cuántos días se guarda en R2 una imagen que nadie pidió (la misma idea que DIAS_DE_MEMORIA de web/lib/cache-tarjetas.js). */
export const DIAS_EN_R2 = 3;
/** Tope de imágenes en R2 (~0,5 MB cada una: 3.000 son ~1,5 GB, dentro de los 10 GB gratis). Si se pasa, se borran las menos recientes. */
export const TOPE_EN_R2 = 3000;
/** Cuánto se espera a R2 por imagen (ms) y cuántas fallas seguidas apagan la memoria remota en ese proceso. */
export const ESPERA_MAXIMA_MS = 10000;
export const FALLAS_PARA_APAGAR = 5;

const si = (v) => /^\s*(si|sí|true|1)\s*$/i.test(String(v ?? ''));

export const claveEnR2 = (huella) => `${PREFIJO_EN_R2}${huella}.png`;
export const huellaDeLaClave = (clave) => String(clave).slice(PREFIJO_EN_R2.length).replace(/\.png$/, '');

/** Los datos de R2 para las tarjetas, o null si el interruptor está apagado o falta algo. Usa el depósito del motor (R2_MOTOR). */
export function configuracionDeR2(env = process.env) {
  if (!si(env?.TARJETAS_EN_R2)) return null;
  const cuenta = env.CLOUDFLARE_ACCOUNT_ID;
  const bucket = String(env.R2_MOTOR ?? '').trim();
  if (!cuenta || !bucket || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) return null;
  return { cuenta, bucket, accessKey: env.R2_ACCESS_KEY_ID, secretKey: env.R2_SECRET_ACCESS_KEY };
}

const esPng = (b) => Boolean(b) && b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;

/**
 * Un lector que baja una imagen por su huella. `traer(huella)` devuelve los bytes (Uint8Array) o null (no está, no es un PNG, R2 falló).
 * Después de `fallasParaApagar` fallas SEGUIDAS (errores de red o de R2; que una imagen no exista no cuenta) deja de preguntar en ese proceso.
 */
export function crearLectorDeTarjetas({ cliente, fallasParaApagar = FALLAS_PARA_APAGAR } = {}) {
  let seguidas = 0;
  const cuenta = { pedidas: 0, bajadas: 0, noEstaban: 0, fallas: 0 };
  return {
    cuenta,
    get apagado() { return seguidas >= fallasParaApagar; },
    async traer(huella) {
      if (!cliente || seguidas >= fallasParaApagar) return null;
      cuenta.pedidas += 1;
      try {
        const bytes = await cliente.leer(claveEnR2(huella));
        seguidas = 0;
        if (!bytes) { cuenta.noEstaban += 1; return null; }
        if (!esPng(bytes)) { cuenta.fallas += 1; return null; }
        cuenta.bajadas += 1;
        return bytes;
      } catch {
        seguidas += 1;
        cuenta.fallas += 1;
        return null;
      }
    },
  };
}

let delProceso = null;
/** El lector del proceso (uno solo por proceso de la compilación), armado con las variables de entorno; null si el interruptor está apagado. */
export function lectorDelProceso(env = process.env, { fetchFn = fetch } = {}) {
  if (delProceso && delProceso.para === env.TARJETAS_EN_R2) return delProceso.lector;
  const config = configuracionDeR2(env);
  let lector = null;
  if (config) {
    try {
      lector = crearLectorDeTarjetas({ cliente: clienteR2({ ...config, fetchFn: (u, o) => fetchFn(u, { ...o, signal: AbortSignal.timeout(ESPERA_MAXIMA_MS) }) }) });
    } catch { lector = null; }
  }
  delProceso = { para: env.TARJETAS_EN_R2, lector };
  return lector;
}

/** Sólo para las pruebas: olvida el lector del proceso. */
export function olvidarElLectorDelProceso() { delProceso = null; }

/**
 * Lo que llama la compilación cuando una imagen no está en el disco: la baja de R2 y la guarda en la carpeta de la memoria (con `guardar`, que es
 * guardarEnLaMemoria de web/lib/cache-tarjetas.js). Devuelve los bytes (Buffer) o null. Nunca tira.
 */
export async function traerTarjetaDeR2(carpeta, huella, guardar, { env = process.env, lector = lectorDelProceso(env) } = {}) {
  if (!carpeta || !lector) return null;
  try {
    const bytes = await lector.traer(huella);
    if (!bytes) return null;
    const buffer = Buffer.from(bytes);
    guardar(carpeta, huella, buffer);
    return buffer;
  } catch {
    return null;
  }
}
