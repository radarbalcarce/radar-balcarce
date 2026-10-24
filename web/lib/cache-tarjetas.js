// La memoria de las tarjetas de las notas (23/10/2026, regla 305): lo que se dibujó una vez no se dibuja de nuevo mientras no cambie.
//
// Cada nota tiene dos imágenes (la apaisada para compartir el enlace y la de Instagram) y la compilación las dibujaba TODAS en cada vuelta
// (~1.000 con el tope de 500 notas), aunque ninguna hubiera cambiado desde la media hora anterior. Ahora cada imagen tiene una HUELLA: el
// diseño (el código de la tarjeta y las tipografías), el formato, el título, la sección, la fecha que lleva el pie y los bytes de la foto.
// Si la huella ya está en la carpeta de la memoria, se reutiliza el PNG; si no, se dibuja y se guarda.
//
// Sin dependencias (sólo lo de Node) y sin next/og: lo que se puede probar sin levantar el sitio (pruebas/cache-tarjetas.test.mjs).
// La carpeta es `.cache/tarjetas/` de la raíz del repositorio, y `.cache/` ya la guarda la caché de Actions entre vueltas. Si algo falla
// (carpeta de sólo lectura, archivo roto) se dibuja como siempre: la memoria nunca frena la compilación.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fechaCorta } from './tarjeta-diseno.js';

const sha = (x) => crypto.createHash('sha1').update(x).digest('hex');

/** Cuántos días se guarda una imagen que ya nadie pide (la poda corre después de compilar: web/scripts/podar-tarjetas.mjs). */
export const DIAS_DE_MEMORIA = 3;

/** La carpeta de la memoria. `TARJETAS_SIN_CACHE=1` la apaga (null). Se compila desde web/ (process.cwd()). */
export function carpetaDeLaMemoria(env = process.env, cwd = process.cwd()) {
  if (env.TARJETAS_SIN_CACHE === '1') return null;
  return env.TARJETAS_CACHE || path.join(cwd, '..', '.cache', 'tarjetas');
}

/**
 * La huella del DISEÑO: el código que dibuja la tarjeta y las tipografías. Si cambia cualquiera, todas las imágenes se vuelven a dibujar.
 * null si no se pudo leer algo (entonces no se usa la memoria).
 */
export function huellaDelDiseno({ cwd = process.cwd() } = {}) {
  try {
    const fuentes = path.join(cwd, '..', 'reels', 'marca', 'fuentes');
    const archivos = [
      path.join(cwd, 'lib', 'tarjeta.js'),
      path.join(cwd, 'lib', 'tarjeta-diseno.js'),
      ...['SourceSerif4-900.ttf', 'Inter-400.ttf', 'Inter-600.ttf'].map((f) => path.join(fuentes, f)),
    ];
    const h = crypto.createHash('sha1');
    for (const a of archivos) h.update(fs.readFileSync(a));
    return h.digest('hex');
  } catch {
    return null;
  }
}

/**
 * La huella de una imagen. Sólo entra lo que la imagen dibuja: título, sección, el "28 sep" del pie y, si lleva foto, los bytes de la foto
 * (`fotoBytes`; null si no lleva). El resto de la nota (cuerpo, medios, relevancia…) cambia seguido y no se ve en la imagen.
 */
export function huellaDeTarjeta(nota = {}, { instagram = false, fotoBytes = null, diseno = '' } = {}) {
  return sha(JSON.stringify([
    diseno,
    instagram ? 'instagram' : 'enlace',
    nota.titulo ?? null,
    nota.seccion ?? null,
    fechaCorta(nota),
    fotoBytes ? sha(fotoBytes) : null,
  ]));
}

const rutaDe = (carpeta, clave) => path.join(carpeta, `${clave}.png`);

/** Los bytes de la imagen guardada, o null. Al usarla le renueva la fecha: lo que se sigue pidiendo no se poda. */
export function leerDeLaMemoria(carpeta, clave) {
  if (!carpeta) return null;
  try {
    const ruta = rutaDe(carpeta, clave);
    const bytes = fs.readFileSync(ruta);
    if (bytes.length < 8 || bytes.readUInt32BE(0) !== 0x89504e47) return null; // no es un PNG: se dibuja de nuevo
    const ahora = new Date();
    try { fs.utimesSync(ruta, ahora, ahora); } catch { /* sólo la poda lo necesita */ }
    return bytes;
  } catch {
    return null;
  }
}

/** Guarda la imagen (con un nombre de paso y renombrando, para que otro proceso nunca lea un archivo a medio escribir). Nunca falla. */
export function guardarEnLaMemoria(carpeta, clave, bytes) {
  if (!carpeta) return false;
  try {
    fs.mkdirSync(carpeta, { recursive: true });
    const destino = rutaDe(carpeta, clave);
    const paso = `${destino}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(paso, bytes);
    fs.renameSync(paso, destino);
    return true;
  } catch {
    return false;
  }
}

/** Borra de la memoria lo que no se pidió en `dias` días (y los restos `.tmp` de más de una hora). Devuelve cuántos archivos sacó. */
export function podarLaMemoria(carpeta, { dias = DIAS_DE_MEMORIA, ahora = Date.now() } = {}) {
  if (!carpeta) return 0;
  let borrados = 0;
  let nombres = [];
  try { nombres = fs.readdirSync(carpeta); } catch { return 0; }
  for (const n of nombres) {
    try {
      const ruta = path.join(carpeta, n);
      const edad = ahora - fs.statSync(ruta).mtimeMs;
      const limite = n.endsWith('.tmp') ? 3600 * 1000 : dias * 86400 * 1000;
      if (edad > limite) { fs.rmSync(ruta, { force: true }); borrados += 1; }
    } catch { /* un archivo que no se puede mirar se deja */ }
  }
  return borrados;
}
