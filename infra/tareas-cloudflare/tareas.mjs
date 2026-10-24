// Las tareas que corren en el Worker de tareas (18/10/2026, mudanza a Cloudflare). Cada una es el reemplazo de un workflow de GitHub: llama al MISMO
// programa (`main` de redes/vigilar.mjs, redes/auditar-notas.mjs, panel/revisar-pistas.mjs, redes/informe-diario.mjs, redes/publicar.mjs,
// web/scripts/ilustrar-notas.mjs), con la misma lógica y los mismos textos, y declara qué archivos lee y cuáles guarda (corredor.mjs).
//
// `lee` y `escribe` no se inventan: una prueba (pruebas/tareas-cloudflare.test.mjs) corre cada programa con los datos reales del repositorio y
// controla que no lea ni escriba nada que no figure acá. Un archivo que falta en `lee` hace que la tarea trabaje "a ciegas" sin que nada falle;
// uno que falta en `escribe` se arma y se pierde al terminar (como pasó el 28/09 con el banco de fotos).
//
// Cada tarea reemplaza a UN workflow (campo `workflow`): el reloj le pide a Cloudflare lo que diga su variable NUBE (infra/reloj-cloudflare/nube.mjs).

import path from 'node:path';
import fs from 'node:fs';
import { main as vigilar } from '../../redes/vigilar.mjs';
import * as auditarNotas from '../../redes/auditar-notas.mjs';
import * as revisarPistas from '../../panel/revisar-pistas.mjs';
import * as informeDiario from '../../redes/informe-diario.mjs';
import { unirArchivo } from '../../panel/unir-conflictos.mjs';
import * as ilustrar from '../../web/scripts/ilustrar-notas.mjs';
import { diaAR } from '../../ingesta/zona.mjs';
import { shaDeBlob } from '../compartido/github.mjs';
import { fotosEnR2Activas, lectorDeBucket, lectorPorUrl } from '../compartido/fotos-r2.mjs';
import { escribirEn } from './corredor.mjs';
import { fechaDeLosMensajes, leerJsonDe } from './util.mjs';
import { REDES } from './redes.mjs';

export { fechaDeLosMensajes };

/** Une dos versiones de pistas.json / notas-de-pistas.json como lo hacía el workflow en un choque (panel/unir-conflictos.mjs). */
const unirPistas = (ruta, nuestro, ajeno, base) => {
  const j = (x) => { try { return x == null ? null : JSON.parse(x); } catch { return null; } };
  return unirArchivo(ruta, j(base) ?? {}, j(ajeno) ?? {}, j(nuestro) ?? {});
};

// ------------------------------------------------------------------ las seis

export const TAREAS = {
  vigilancia: {
    nombre: 'vigilancia', workflow: 'vigilancia.yml',
    lee: [
      'web/data/redes.json', 'web/data/vigilancia.json', 'web/data/portada.json', 'web/data/auditoria.json', 'web/data/efemerides-piezas.json',
      'web/data/estadisticas.json', 'web/data/estadisticas-piezas.json', 'web/data/archivo.json', 'web/data/notas-por-dia.json', 'reels/fijas/vigencia.json',
      // Las lee el cronograma de las redes (ingesta/datos-vivos.mjs, por la carpeta del proyecto: en un Worker es la de trabajo).
      'web/data/efemerides-elegidas.json', 'web/data/feriados-piezas.json',
    ],
    escribe: ['web/data/vigilancia.json', 'web/data/estadisticas.json', 'web/data/estadisticas-piezas.json'],
    mensaje: ({ ahora }) => `Vigilancia: estado de avisos · ${fechaDeLosMensajes(ahora)}`,
    // Los modos de prueba del workflow ("probar-resumen", "probar-cierre") no guardan nada.
    ejecutar: async ({ env, raiz, inputs }) => {
      const modo = inputs?.modo;
      const argv = modo === 'probar-resumen' ? ['--probar-resumen'] : modo === 'probar-cierre' ? ['--probar-cierre'] : [];
      await vigilar({ argv, env, raiz });
      return {};
    },
    // En los modos de prueba, aunque el programa no escriba, el corredor no guarda: el workflow tampoco lo hacía.
    sinGuardarEn: (inputs) => ['probar-resumen', 'probar-cierre'].includes(inputs?.modo),
  },

  'auditoria-ia': {
    nombre: 'auditoria-ia', workflow: 'auditoria-ia.yml',
    lee: auditarNotas.ARCHIVOS_QUE_LEE,
    escribe: auditarNotas.ARCHIVOS_QUE_ESCRIBE,
    mensaje: ({ ahora }) => `Auditoría IA · ${fechaDeLosMensajes(ahora)}`,
    ejecutar: async ({ env, raiz, inputs }) => {
      await auditarNotas.main({ argv: String(inputs?.simular) === 'true' ? ['--simular'] : [], env, raiz });
      return {};
    },
    sinGuardarEn: (inputs) => String(inputs?.simular) === 'true',
  },

  pistas: {
    nombre: 'pistas', workflow: 'pistas.yml',
    lee: revisarPistas.ARCHIVOS_QUE_LEE,
    escribe: revisarPistas.ARCHIVOS_QUE_ESCRIBE,
    // Lo que una persona decide desde el celular en pistas.json no se pisa: se une cambio por cambio, como en el workflow (P-2).
    unir: { 'web/data/pistas.json': unirPistas, 'web/data/notas-de-pistas.json': unirPistas },
    mensaje: ({ ahora }) => `Pistas · ${fechaDeLosMensajes(ahora)}`,
    ejecutar: async ({ env, raiz, inputs }) => {
      const argv = [];
      if (String(inputs?.simular) === 'true') argv.push('--simular');
      if (inputs?.id) argv.push(`--id=${inputs.id}`);
      await revisarPistas.main({ argv, env, raiz });
      return {};
    },
    sinGuardarEn: (inputs) => String(inputs?.simular) === 'true',
  },

  'informe-diario': {
    nombre: 'informe-diario', workflow: 'informe-diario.yml',
    lee: [
      'web/data/portada.json', 'web/data/redes.json', 'web/data/notas-por-dia.json', 'web/data/estadisticas.json', 'web/data/uso-ia.json',
      'web/data/vigilancia.json', 'web/data/esperando-cuerpo.json', 'web/data/archivo.json', 'web/data/efemerides-piezas.json', 'web/data/estadistica-seleccion.json',
      'web/data/feriados-piezas.json', 'web/data/efemerides-elegidas.json', 'reels/fijas/vigencia.json', 'web/data/revision-archivo.json',
    ],
    escribe: [],
    mensaje: () => 'Informe diario',
    ejecutar: async ({ env, raiz, inputs, bindings, escribirEn: poner }) => {
      // El estado del motor (sus últimas vueltas y los avisos de fuentes), que vive en R2, para el informe (consultarEnVivo).
      try {
        const o = await bindings?.MOTOR?.get('motor/estado.json');
        if (o) poner('.motor/estado.json', new Uint8Array(await o.arrayBuffer()));
      } catch { /* sin el estado del motor, el informe lo dice */ }
      const momento = inputs?.momento === 'manana' ? 'manana' : inputs?.momento === 'noche' ? 'noche' : undefined;
      const argv = [...(momento ? [`--momento=${momento}`] : []), ...(String(inputs?.enviar) === 'false' ? [] : ['--enviar'])];
      await informeDiario.main({ argv, env, raiz });
      return {};
    },
  },

  // Las ilustraciones con IA para las notas sin foto: el modo automático (regla 185), revisar y aplicar en una sola corrida.
  'ilustrar-notas': {
    nombre: 'ilustrar-notas', workflow: 'ilustrar-notas.yml',
    lee: ['web/data/portada.json', 'web/data/archivo.json', 'web/data/banco-fotos.json', 'web/data/fotos-manuales.json', 'web/data/fotos-ia.json'],
    escribe: ['web/data/fotos-ia.json'],
    carpetas: ['web/public/fotos-notas/'],
    borra: ['web/public/fotos-notas/'],
    // FOTOS_EN_R2 (regla 316): con el interruptor prendido las ilustraciones nuevas van al depósito de fotos (binding ARCHIVO) y no al commit: son unas 12 por
    // día de ~180 KB (2 MB por día de historial de git). Apagado, o si la subida falla, siguen yendo al commit como siempre.
    fotosAR2: ({ env }) => fotosEnR2Activas(env),
    // El cupo del día (cuántas imágenes se generaron hoy) sobrevive entre corridas en R2, como antes en los adjuntos «cuenta-ilustraciones».
    memoria: ['.cache/cuentas/'],
    mensaje: () => 'Ilustraciones con IA para notas sin foto (automático)',
    // Una ilustración vieja sin control se vuelve a mirar (regla 206): hace falta su archivo, que no es de los que se bajan siempre.
    despuesDeBajar: async ({ github, raiz, bajados, env = {}, bindings = {} }) => {
      const mas = new Map();
      const libro = (() => { try { return JSON.parse(new TextDecoder().decode(bajados.get('web/data/fotos-ia.json')?.bytes ?? new Uint8Array())); } catch { return {}; } })();
      // Con FOTOS_EN_R2 la foto puede no estar en git: se busca en R2 (el binding ARCHIVO, sin claves) y, si no, por la dirección pública del sitio.
      const leerDeR2 = fotosEnR2Activas(env)
        ? (bindings.ARCHIVO ? lectorDeBucket(bindings.ARCHIVO) : lectorPorUrl(env.SITIO || 'https://radarbalcarce.com'))
        : null;
      for (const nombre of ilustrar.archivosDeIlustracionesSinControl(libro)) {
        const ruta = `web/public/fotos-notas/${nombre}`;
        let bytes = await github.leerArchivo(ruta);
        let deR2 = false;
        if (!bytes && leerDeR2) { try { bytes = await leerDeR2(nombre); deR2 = Boolean(bytes); } catch { bytes = null; } }
        // `deR2`: una copia de trabajo; el corredor no la sube a git ni la borra de git (en GitHub no está).
        if (bytes) { escribirEn(raiz, ruta, bytes); mas.set(ruta, { sha: await shaDeBlob(bytes), bytes, ...(deR2 ? { deR2: true } : {}) }); }
      }
      return mas;
    },
    ejecutar: async ({ env, raiz, bindings, ahora, inputs, esperar }) => {
      const rutas = {
        portada: path.join(raiz, 'web', 'data', 'portada.json'), archivo: path.join(raiz, 'web', 'data', 'archivo.json'),
        banco: path.join(raiz, 'web', 'data', 'banco-fotos.json'), manuales: path.join(raiz, 'web', 'data', 'fotos-manuales.json'),
        ilustraciones: path.join(raiz, 'web', 'data', 'fotos-ia.json'), carpeta: path.join(raiz, 'web', 'public', 'fotos-notas'),
      };
      const cuentas = path.join(raiz, '.cache', 'cuentas');
      // Las cuentas de más de 2 días no sirven (el tope es por día): se limpian para que la memoria no crezca.
      if (fs.existsSync(cuentas)) {
        const corte = Date.parse(`${diaAR(new Date(ahora.getTime() - 2 * 86400e3))}T00:00:00-03:00`);
        for (const n of fs.readdirSync(cuentas)) {
          const c = leerJsonDe(raiz, `.cache/cuentas/${n}/cuenta.json`);
          if (c && Date.parse(c.cuando) < corte) fs.rmSync(path.join(cuentas, n), { recursive: true });
        }
      }
      // El Worker de imágenes se llama por su binding de servicio (un Worker no puede pedirle algo a otro por su dirección pública de la misma cuenta).
      const fetchFn = async (url, init) => (bindings?.IMAGENES && String(url).startsWith(ilustrar.URL_DEL_WORKER.replace(/\/generar$/, ''))
        ? bindings.IMAGENES.fetch(new Request(url, init)) : fetch(url, init));
      await ilustrar.automatico({
        salida: path.join(raiz, '.cache', 'ilustraciones'), informe: null, rutas, ahora, fetchFn, ...(esperar ? { esperar } : {}),
        horas: ilustrar.horasPedidas(inputs?.horas), conservarSiFalta: fotosEnR2Activas(env),
        cuenta: path.join(cuentas, `${diaAR(ahora)}-${ahora.getTime()}`), cuentas: ilustrar.leerCuentas(cuentas),
        clave: (env.GEMINI_API_KEY_REDACCION ?? '').trim(), claveClasificacion: (env.GEMINI_API_KEY_CLASIFICACION ?? '').trim(), claveGroq: (env.GROQ_API_KEY ?? '').trim(), claveOpenRouter: (env.OPENROUTER_API_KEY ?? '').trim(), token: (env.VIGILANTE_TOKEN ?? '').trim(),
      });
      return {};
    },
  },
};

// Redes (la más grande: Facebook, lo que toca y lo que el render dejó listo) vive en redes.mjs.
TAREAS.redes = REDES;

export function tareaPorNombre(nombre) { return TAREAS[nombre] ?? null; }
export function tareaPorWorkflow(archivo) { return Object.values(TAREAS).find((t) => t.workflow === archivo) ?? null; }
