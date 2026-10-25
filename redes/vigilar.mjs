// El vigilante: revisa que todo ande y avisa por WhatsApp cuando algo falla.
//
//   node redes/vigilar.mjs                  revisa y, si hace falta, avisa
//   node redes/vigilar.mjs --sin-avisar     sólo muestra lo que encontró
//   node redes/vigilar.mjs --probar-resumen manda el resumen de las 21 (ver abajo)
//   node redes/vigilar.mjs --probar-cierre  muestra el cierre del día contra Meta
//                                           y el WhatsApp que saldría, sin mandarlo
//
// Corre cada 3 horas (workflow "Vigilancia", disparado por el reloj de Cloudflare; hasta el 17/10/2026, cada 30 minutos) y
// mira, desde afuera, lo que un lector vería (lo urgente de la web lo mira además, cada media hora, el vigilante de Cloudflare):
//
//   · que la web responda y se haya actualizado hace poco;
//   · que las corridas de GitHub (web, redes, Cloudflare) no estén fallando;
//   · que el reloj esté despertando a Redes, a la Auditoría IA y a las Pistas;
//   · que las piezas fijas del día (clima, farmacia) hayan salido en su hora,
//     y el contrato del día (redes/contrato.mjs), con el cierre de las 23:30
//     contra lo que Meta tiene de verdad; con REDES_ACTIVAS apagado, sólo lo
//     dice una vez por día;
//   · que `www` redirija al dominio sin `www`;
//   · lo que vence y hay que renovar a mano (el token de GitHub, el dominio,
//     las voces propias), con 30 días de aviso;
//   · que las claves de IA sigan andando y que Gemini tenga las dos voces
//     propias (29/09: se suspendió la clave paga y nos enteramos mirando);
//   · que la portada NO vuelva a mostrar lo que se pidió sacar (la fuente arriba
//     de un título, "la vimos hace…", hasta qué hora está la farmacia), y que
//     la mayoría de las notas tengan cuerpo. Ver docs/10-REGLAS-Y-PRUEBAS.md.
//
// Los problemas se avisan una vez cada seis horas (no un mensaje cada media
// hora por lo mismo). El resumen de las 21 (y las estadísticas, y el informe de
// notas del día) YA NO salen de acá: desde el 15/10 (regla 176) los trae el
// informe diario por mail (redes/informe-diario.mjs, 8:15 y 21:15); `main` le
// pasa `resumenDelDia: false` a `planDeAvisos`. Lo que sigue avisando es lo que
// no espera: problemas, noticias muy importantes, notas que esperan y lo que
// salió en redes. Cada vuelta deja anotado lo que tiene abierto en
// vigilancia.json (`abiertos`) para que el informe lo cuente.
//
// Desde el 25/09 también avisa lo que conviene saber aunque todo ande
// (redes/avisos.mjs): notas que esperan a una persona, una noticia de
// Balcarce muy importante, lo que salió en redes, y las estadísticas de la
// web y de las redes a las 9 y a las 21 (redes/estadisticas.mjs). Todo junto
// en UN solo WhatsApp por corrida: CallMeBot bloquea si se abusa.
//
//   node redes/vigilar.mjs --probar-resumen   manda UN WhatsApp con el resumen
//                                             de las 21, tal cual, para ver
//                                             cómo llega (no guarda nada)
//
// La parte que decide (`evaluar`, `planDeAvisos`) son funciones puras: reciben
// lo observado y devuelven qué decir. Se prueban sin red. Lo que baja datos y
// manda el mensaje está abajo, en `main`.
//
// Sin dependencias: sólo lo que trae Node.

import fs from 'node:fs';
import path from 'node:path';
import { cronogramaDelDia, ventanaDe, claveDePieza } from './piezas.mjs';
import { yaPublicada, estaActivo } from './elegir.mjs';
import { horaAR, diaAR, minutoDelDiaAR } from '../ingesta/zona.mjs';
import { leerJson as leer } from '../ingesta/json.mjs';
import { sinSecretos } from './whatsapp.mjs';
import { avisar, hayMail, hayWhatsApp } from './avisar-por-mail.mjs';
import { auditoriaVencida } from './auditar.mjs';
import { contratoDelDia, CONTRATO_DESDE } from './contrato.mjs';
import {
  consultarMeta, informeDelDia, textoCierre, lineaDeCierreCompleto, textoInforme,
} from './auditar-redes.mjs';
import { CONTRATO_DIARIO } from '../ingesta/criterio.mjs';
import { crearCliente, PAGINA_DE_FACEBOOK } from './meta.mjs';
import { copiasRepetidas } from './espejo.mjs';
import { VOCES } from './prompt-redes.mjs';
import {
  importantesAAvisar, textoImportantes, anotarImportantes, pendientesAAvisar, textoPendientes,
  anotarPendientes, novedadesEnRedes, textoRedes, datosDelDia, textoResumen, armarMensaje, textoInformeDelDia, recortar,
} from './avisos.mjs';
import {
  medir, tocaMedir, turnoDeMedicion, agregarPunto, textoEstadisticas, nombresDeCaminos, esIncoherente,
} from './estadisticas.mjs';
import { mezclarDias } from './estadisticas-detalle.mjs';
import { raizDelProyecto } from './raiz.mjs';
import { medirPiezas } from './estadisticas-piezas.mjs';

/**
 * ¿Están prendidas las redes? Es la variable REDES_ACTIVAS de GitHub, que la
 * corrida de Vigilancia recibe por entorno (vigilancia.yml). Sin la variable
 * DEFINIDA en el entorno (una corrida a mano, sin GitHub) se asume que sí: es
 * más seguro avisar de más que callar. En GitHub la variable siempre está
 * definida: sin valor es texto vacío, y eso es "apagadas", igual que en redes.yml.
 */
export function redesPrendidas(env = process.env) {
  return env.REDES_ACTIVAS === undefined ? true : estaActivo(env.REDES_ACTIVAS);
}

/** Lo que dice el vigilante, una vez por día, cuando las redes están apagadas. */
export const TEXTO_REDES_APAGADAS = 'Las redes están apagadas (la variable REDES_ACTIVAS de GitHub no dice "Si"): es esperable que no salga nada en Facebook ni en Instagram, y por eso no se avisa pieza por pieza. Cuando se prendan, vuelve a vigilarse todo.';

/** Las piezas que tienen que salir todos los días: si no salió una, es un
 *  problema. Los podcasts no están: dependen de que haya notas para contar. */
export const PIEZAS_FIJAS = ['clima-manana', 'farmacia', 'clima-noche'];

/** Qué quiere decir que falle cada paso de "Actualizar la web", dicho para una persona. */
export const QUE_SIGNIFICA_EL_PASO = {
  'Probar que nada se rompió': 'Una prueba automática falló: por seguridad la web NO se actualiza hasta que se arregle (hay que abrir la corrida en GitHub Actions y ver cuál).',
  'Compilar el sitio': 'El sitio no compila con los datos de esta vuelta: la web sigue con lo último bueno pero no se actualiza (hay que ver el error en GitHub Actions).',
  'Buscar noticias y armar los datos': 'No se pudieron armar los datos de esta vuelta: la web sigue con lo último bueno.',
  'Revisar que el SEO siga en pie': 'Falta algo del SEO en el HTML (título, descripción o tarjeta): la web no se actualiza hasta arreglarlo.',
  // 17/10/2026 (regla 189): "Actualizar la web" sube el sitio ella misma, con lo que compiló (antes lo hacía "Cloudflare Pages").
  'Volver a compilar con lo que entró': 'Los datos se guardaron, pero el sitio no compiló con lo que entró mientras se armaba (código o datos de otro lado): la web sigue con la versión anterior hasta que se arregle.',
  'Subir a Cloudflare Pages': 'Los datos se guardaron, pero Cloudflare no aceptó la subida: la web sigue con la versión anterior; la vuelta siguiente lo vuelve a intentar (o correr "Cloudflare Pages" a mano).',
};

/**
 * Los workflows de GitHub cuya última corrida mira el vigilante: si falla, avisa. Archivo → nombre. Los cuatro últimos se sumaron el
 * 8/10/2026 (A-4 y T-3): nacieron después del congelamiento del 4/10 para avisar y, si fallaban, sólo llegaba un correo a la cuenta de GitHub.
 */
export const WORKFLOWS_VIGILADOS = {
  'actualizar.yml': 'Actualizar la web',
  'redes.yml': 'Redes',
  // (17/10/2026: sale "Cloudflare Pages", cloudflare-deploy.yml: quedó sólo a mano, de rescate. La subida de cada media hora es un paso de
  // "Actualizar la web", que ya se mira arriba; una corrida a mano que falló quedaría avisando para siempre.)
  'respaldo.yml': 'Respaldo',
  'armado-vacio.yml': 'Armado con datos vacíos',
  'pruebas-otra-hora.yml': 'Pruebas con otra hora',
  'auditoria-ia.yml': 'Auditoría IA',
  'pistas.yml': 'Pistas',
  'informe-diario.yml': 'Informe diario',
};

export const LIMITES = {
  minutosSinActualizar: 100,   // la web se arma cada 30
  minutosSinReloj: 100,        // el reloj de redes corre a los :05, :35 y :45, de 7 a 23
  minutosSinAuditoriaIA: 180,  // la auditoría IA corre cada hora (:41) de 7 a 23 (17/10/2026: la dispara el reloj)
  minutosSinPistas: 420,       // las pistas, cada 3 horas (:23)
  minutosSinRespaldo: 10 * 24 * 60, // el respaldo corre cada domingo
  horasEntreAvisos: 6,
  horasEntreAvisosDeRedesApagadas: 24, // el recordatorio de "redes apagadas": una vez por día
  minimoDeNotasConCuerpo: 0.35, // de las últimas 24 horas; con 10 notas o más
  horaDelResumen: 21,
  horasSinArchivar: 6,          // el archivo permanente corre en cada despliegue (cada 30 minutos)
  horasSinArchivarAlta: 24,     // las notas tienen ~4 días de margen antes de salir del sitio
};

/** Dónde muestra el Worker del archivo permanente el estado de su última corrida (infra/archivo-cloudflare/, 16/10/2026). */
export const ESTADO_DEL_ARCHIVO = 'https://radar-balcarce-archivo.radarbalcarce.workers.dev/_archivo/estado';

/**
 * Lo que está mal en el archivo permanente (16/10/2026), según su estado.json (`obs` = { http, estado } o null si el archivo no está
 * prendido: sin la variable R2_ARCHIVO no se mira nada). Si deja de correr o falla, las notas viejas se pueden perder cuando salgan del
 * sitio, y lo retirado (menores, víctimas) podría no haberse borrado del archivo.
 */
export function problemasDelArchivoR2(obs, ahora = new Date()) {
  if (!obs) return [];
  const paso = 'el paso "Archivar las notas por salir (R2)" del workflow "Actualizar la web" en GitHub Actions';
  const e = obs.estado;
  if (!e || typeof e !== 'object' || !e.cuando) {
    return [{ clave: 'archivo-r2-sin-estado', nivel: 'media', texto: `No pude leer el estado del archivo permanente (HTTP ${obs.http || 'sin respuesta'} en ${ESTADO_DEL_ARCHIVO}). Con la variable R2_ARCHIVO puesta, el Worker radar-balcarce-archivo tiene que contestar: revisá Cloudflare → Workers y ${paso}.` }];
  }
  const problemas = [];
  const horas = (ahora.getTime() - new Date(e.cuando).getTime()) / 3600e3;
  if (Number.isFinite(horas) && horas > LIMITES.horasSinArchivar) {
    problemas.push({ clave: 'archivo-r2-atrasado', nivel: horas > LIMITES.horasSinArchivarAlta ? 'alta' : 'media', texto: `El archivo permanente no corre hace ${Math.round(horas)} horas (tendría que correr en cada despliegue, cada media hora). Las notas tienen unos días de margen antes de salir del sitio, pero si sigue así se pierden páginas viejas. Mirá ${paso}.` });
  }
  if (e.ok === false) {
    const soloTiempo = /se acabó el tiempo/.test(String(e.motivo ?? '')) && !e.fallidos;
    problemas.push({ clave: 'archivo-r2-fallo', nivel: soloTiempo ? 'media' : 'alta', texto: `La última corrida del archivo permanente salió mal${e.motivo ? ` (${String(e.motivo).slice(0, 160)})` : ''}${e.fallidos ? `: ${e.fallidos} objeto(s) no se pudieron subir o borrar` : ''}. El sitio se publica igual, pero lo que está por salir puede no estar guardado y lo retirado puede no haberse borrado de R2. Mirá ${paso}.` });
  }
  return problemas;
}

/**
 * Cosas que vencen en una fecha conocida y hay que renovar a mano. El aviso
 * sale 30 días antes y se repite (cada seis horas, como todos).
 */
export const VENCIMIENTOS = [
  // (15/10/2026: se sacó el aviso del token de GitHub de cron-job.org, que vencía el 21/09/2027. El reloj ahora es el Worker de
  // Cloudflare y su token, RELOJ_GITHUB_TOKEN, se creó sin vencimiento.)
  {
    // Sumado el 25/09 (auditoría). Si el dominio vence, se cae todo junto: la
    // web, los enlaces de cada posteo de Facebook y de cada podcast.
    clave: 'vence-dominio', fecha: '2027-09-21',
    texto: 'El dominio radarbalcarce.com vence el 21/09/2027. Hay que renovarlo en DonWeb (donde está registrado) antes de esa fecha: si vence, la web y los enlaces de todos los posteos dejan de andar.',
  },
];
export const DIAS_DE_AVISO_ANTES = 30;

/**
 * Las claves de IA que se revisan en cada vuelta (29/09). Ese día Google
 * suspendió la clave paga, la voz se cortó y nos enteramos mirando. Se pregunta
 * algo que no gasta cupo (la lista de modelos) y, con la de redes, por cada una
 * de las dos voces propias: si sigue existiendo y cuándo vence (Google lo dice;
 * vencen al año de crearse). Una clave que no está cargada no se revisa.
 */
export const CLAVES_DE_IA = [
  { nombre: 'GEMINI_API_KEY_REDACCION', uso: 'redactar las notas', proveedor: 'gemini' },
  { nombre: 'GEMINI_API_KEY_REDES', uso: 'las voces de las redes', proveedor: 'gemini' },
  { nombre: 'GEMINI_API_KEY_CLASIFICACION', uso: 'la lectura con IA y las fotos', proveedor: 'gemini' },
  { nombre: 'GROQ_API_KEY', uso: 'el respaldo de la lectura y de las fotos', proveedor: 'groq' },
  // 17/10/2026: el último respaldo con modelos gratis. Si no está cargada, no se revisa ni se avisa nada.
  { nombre: 'OPENROUTER_API_KEY', uso: 'el último respaldo de la IA (modelos gratis)', proveedor: 'openrouter' },
];

const API_GEMINI = 'https://generativelanguage.googleapis.com/v1beta';

/** El mensaje de error de una respuesta, corto y sin la clave. */
async function detalleDe(res, clave) {
  const texto = await res.text().catch(() => '');
  let mensaje = texto;
  try { mensaje = JSON.parse(texto)?.error?.message ?? texto; } catch { /* no era JSON */ }
  return sinSecretos(String(mensaje).replace(/\s+/g, ' ').trim(), clave).slice(0, 140);
}

/**
 * Qué contesta cada proveedor a cada clave, y si Gemini todavía tiene las dos
 * voces propias. Devuelve { claves: [{ nombre, uso, proveedor, estado, detalle }],
 * voces: { locutora: { existe, vence }, locutor: { existe, vence } } } (`existe`
 * es true, false o null si no se pudo mirar; `vence`, la fecha que da Google).
 * Nunca lanza: sin red, `estado` queda en null y no se avisa nada.
 */
export async function revisarClaves({ env = process.env, fetchFn = fetch, voces = VOCES } = {}) {
  const claves = [];
  const pedir = async (url, cabeceras) => {
    try {
      return await fetchFn(url, { headers: cabeceras, signal: AbortSignal.timeout(15000) });
    } catch {
      return null;
    }
  };
  for (const c of CLAVES_DE_IA) {
    const clave = String(env[c.nombre] ?? '').trim();
    if (!clave) continue;
    // Para OpenRouter se pregunta por la clave misma (no gasta ningún pedido de los 50 gratis del día): 401 si no existe más.
    const res = c.proveedor === 'groq'
      ? await pedir('https://api.groq.com/openai/v1/models', { authorization: `Bearer ${clave}` })
      : c.proveedor === 'openrouter'
        ? await pedir('https://openrouter.ai/api/v1/key', { authorization: `Bearer ${clave}` })
        : await pedir(`${API_GEMINI}/models?pageSize=1`, { 'x-goog-api-key': clave });
    claves.push({ ...c, estado: res?.status ?? null, detalle: res && !res.ok ? await detalleDe(res, clave) : '' });
  }
  // Las voces propias viven en el proyecto de la clave de redes. Google contesta
  // 404 si la voz ya no existe (se borró o venció) y, si existe, su `expire_time`.
  const deRedes = String(env.GEMINI_API_KEY_REDES ?? '').trim();
  const hay = { locutora: { existe: null, vence: null }, locutor: { existe: null, vence: null } };
  if (deRedes && voces) {
    for (const quien of ['locutora', 'locutor']) {
      const res = await pedir(`${API_GEMINI}/voices/${voces[quien]}`, { 'x-goog-api-key': deRedes });
      if (res?.status === 404) hay[quien].existe = false;
      else if (res?.ok) {
        const j = await res.json().catch(() => null);
        hay[quien] = { existe: true, vence: j?.expire_time ?? null };
      }
    }
  }
  return { claves, voces: hay };
}

/** Qué hacer cuando una clave no anda. */
const ARREGLO_DE_CLAVE = {
  gemini: (nombre) => `Entrá a Google AI Studio (radarbalcarce@gmail.com), fijate si la clave o su proyecto están suspendidos o sin crédito y, si hace falta, creá una clave nueva y pegala en GitHub → Settings → Secrets and variables → Actions → ${nombre} (nunca en un chat).`,
  groq: (nombre) => `Entrá a console.groq.com, creá una clave nueva y pegala en GitHub → Settings → Secrets and variables → Actions → ${nombre} (nunca en un chat).`,
  openrouter: (nombre) => `Entrá a openrouter.ai/keys (radarbalcarce@gmail.com), creá una clave nueva y pegala en GitHub → Settings → Secrets and variables → Actions → ${nombre} (nunca en un chat). Si el aviso es 402, la cuenta quedó con saldo negativo: sumá créditos hasta pasar de cero o no uses la clave. Es sólo el último respaldo: la web sigue andando sin ella.`,
};

const minutos = (desde, ahora) => (ahora.getTime() - new Date(desde).getTime()) / 60000;

/**
 * Qué está mal, dado lo que se observó.
 *
 * @param {object} o
 * @param {Date} o.ahora
 * @param {{ estado: number, actualizado: string|null }} o.web   la portada
 * @param {{ redirige: boolean }|null} o.www
 * @param {Record<string, {conclusion:string, status:string, createdAt:string}[]>} o.corridas  por workflow, la más nueva primero
 * @param {object} o.libro  web/data/redes.json
 * @returns {{ clave: string, nivel: 'alta'|'media', texto: string }[]}
 */
/**
 * "Un día como hoy" y las piezas fijas de participá se arman por adelantado y se acaban (C-17, 8/10/2026: el 31/10 se acababan las dos
 * sin aviso). `ultimoDia` es el último día armado de web/data/efemerides-piezas.json ("AAAA-MM-DD") y `fijasHasta` el primer
 * vencimiento de reels/fijas/vigencia.json. Hernán pidió armar el mes siguiente el día 20, para tener por lo menos 10 días de revisión.
 */
export function avisosDeEfemerides({ ahora, ultimoDia = null, fijasHasta = null } = {}) {
  const hoy = diaAR(ahora);
  const dias = (iso) => Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${hoy}T12:00:00Z`)) / 86400000);
  const avisos = [];
  if (ultimoDia) {
    const quedan = dias(ultimoDia);
    const diaDelMes = Number(hoy.slice(8, 10));
    const sigueElMes = ultimoDia.slice(0, 7) === hoy.slice(0, 7);
    if (quedan < 7) {
      avisos.push({ clave: 'efemerides-por-acabarse', nivel: 'alta', texto: `"Un día como hoy" sólo tiene armados ${Math.max(quedan, 0)} día(s) más (hasta el ${ultimoDia.slice(8, 10)}/${ultimoDia.slice(5, 7)}). Hay que armar el mes que sigue (ingesta/generar-efemerides.mjs, docs/13-EFEMERIDES.md).` });
    } else if (diaDelMes >= 20 && sigueElMes) {
      avisos.push({ clave: 'efemerides-por-acabarse', nivel: 'media', texto: `Ya es ${diaDelMes} y el mes que sigue de "Un día como hoy" no está armado (llega hasta el ${ultimoDia.slice(8, 10)}/${ultimoDia.slice(5, 7)}). Hernán pidió armarlo el día 20, para tener 10 días de revisión (docs/13-EFEMERIDES.md).` });
    }
  }
  if (fijasHasta && dias(fijasHasta) <= 7) {
    avisos.push({ clave: 'fijas-por-vencer', nivel: 'media', texto: `Las piezas fijas de participá vencen el ${fijasHasta.slice(8, 10)}/${fijasHasta.slice(5, 7)}: desde entonces gastan un audio por día. Hay que renovarlas o decidir que no (reels/fijas/vigencia.json).` });
  }
  return avisos;
}

/**
 * ¿La lectura de visitas de Cloudflare viene fallando? Un día es "sin lectura" si todas sus mediciones (9 y 21) quedaron
 * incoherentes, sin sitio, o con la web en cero o contradictoria (15/10/2026: el 13, 14 y 15 figuraron en cero tres días sin
 * que nadie lo notara). Con los dos últimos días con mediciones así, se avisa (poco urgente: no tira nada abajo).
 * `puntos` es web/data/estadisticas.json → puntos.
 */
export function lecturaWebFallando(puntos = []) {
  const malo = (p) => p.cloudflare === 'incoherente' || p.cloudflare === 'sitio-no-encontrado' || (p.web ? esIncoherente(p.web) : false);
  const porDia = new Map();
  for (const p of puntos ?? []) {
    if (!p?.cuando || (!p.web && !p.cloudflare)) continue;
    const dia = diaAR(new Date(p.cuando));
    porDia.set(dia, [...(porDia.get(dia) ?? []), p]);
  }
  const ultimos = [...porDia.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-2);
  return ultimos.length === 2 && ultimos.every(([, ps]) => ps.every(malo));
}

export function evaluar({
  ahora, web, www = null, corridas = {}, libro = {}, contenido = null, auditoria = null, contrato = null,
  redesActivas = true, claves = [], voces = null, copiasEnInstagram = [], efemerides = null, puntosWeb = null, archivoR2 = null,
}) {
  const problemas = [];
  const de = (clave, nivel, texto) => problemas.push({ clave, nivel, texto });
  const hora = horaAR(ahora);

  // --- la web
  if (!web || web.estado !== 200) {
    de('web-caida', 'alta', `La web no responde (HTTP ${web?.estado ?? 'sin respuesta'}).`);
  } else if (!web.actualizado) {
    de('web-sin-fecha', 'media', 'No pude leer cuándo se actualizó la web por última vez.');
  } else {
    const min = minutos(web.actualizado, ahora);
    if (min > LIMITES.minutosSinActualizar) {
      de('web-vieja', 'alta', `La web no se actualiza hace ${Math.round(min / 60 * 10) / 10} horas. Revisá el reloj de Cloudflare (Workers → radar-balcarce-reloj) y GitHub Actions.`);
    }
  }
  if (www && !www.redirige) de('www', 'media', 'www.radarbalcarce.com ya no redirige al dominio sin www.');

  // --- que las estadísticas de la web no estén fallando en silencio (15/10: tres días en cero sin aviso)
  if (puntosWeb && lecturaWebFallando(puntosWeb)) {
    de('estadisticas-sin-lectura', 'media', 'Las estadísticas de la web llevan dos días sin una lectura confiable de Cloudflare (números que no cierran, o todo en cero). Las visitas de esos días no son reales. Revisá CLOUDFLARE_ACCOUNT_ID y que el sitio de analítica 63fea168 aparezca en esa cuenta (docs/analiticas/ANALISIS.md, parte 1.3).');
  }

  // --- lo que se pidió que NO aparezca (reglas viejas 1 a 3, hoy R7 y R18 de docs/10-REGLAS-Y-PRUEBAS.md): si vuelve, se avisa
  if (contenido?.home) {
    const h = contenido.home;
    if (h.laVimos) de('regla-la-vimos', 'alta', 'La portada volvió a decir "la vimos hace…" o "sin hora". Se pidió sacarlo (R7, docs/10-REGLAS-Y-PRUEBAS.md).');
    if (h.horaFarmacia) de('regla-hora-farmacia', 'alta', 'La tarjeta de la farmacia volvió a decir hasta qué hora está de turno. Se pidió sacarlo (R18, docs/10-REGLAS-Y-PRUEBAS.md).');
    if (h.fuentesEnChapa) de('regla-fuentes', 'alta', `La portada volvió a mostrar la fuente arriba de los títulos (${h.fuentesEnChapa}). Se pidió sacarlas (R18, docs/10-REGLAS-Y-PRUEBAS.md).`);
  }
  if (contenido?.cuerpos && contenido.cuerpos.total >= 10) {
    const { total, conCuerpo } = contenido.cuerpos;
    if (conCuerpo / total < LIMITES.minimoDeNotasConCuerpo) {
      de('pocos-cuerpos', 'media', `Sólo ${conCuerpo} de ${total} notas de las últimas 24 horas tienen cuerpo. Miré la reescritura en "Actualizar la web" (clave de Gemini, cuota, verificador).`);
    }
  }

  // --- el archivo permanente en R2 (16/10/2026): que corra y que no falle
  for (const p of problemasDelArchivoR2(archivoR2, ahora)) de(p.clave, p.nivel, p.texto);

  // --- "Un día como hoy" y las fijas de participá: que no se acaben sin aviso (C-17)
  if (efemerides) for (const a of avisosDeEfemerides({ ahora, ...efemerides })) de(a.clave, a.nivel, a.texto);

  // --- que la auditoría semanal siga corriendo
  if (auditoriaVencida(auditoria, ahora)) {
    de('auditoria-vencida', 'media', 'La auditoría semanal no corre hace más de 10 días. Revisá el workflow "Auditoría" en GitHub Actions.');
  }

  // --- lo que vence
  for (const v of VENCIMIENTOS) {
    const dias = Math.ceil((new Date(`${v.fecha}T12:00:00-03:00`).getTime() - ahora.getTime()) / 86400000);
    if (dias <= DIAS_DE_AVISO_ANTES) {
      de(v.clave, dias <= 7 ? 'alta' : 'media', dias > 0 ? `Faltan ${dias} día(s): ${v.texto}` : `YA VENCIÓ: ${v.texto}`);
    }
  }

  // --- las claves de IA y las voces propias (29/09). Sólo lo que dice que la
  // clave no sirve (400 a 403): "sin cupo" (429) o un servicio caído (5xx) son de
  // un rato y ya los maneja cada corrida.
  for (const c of claves ?? []) {
    if (![400, 401, 402, 403].includes(c.estado)) continue;
    const quien = { groq: 'Groq', openrouter: 'OpenRouter' }[c.proveedor] ?? 'Google';
    de(`clave-${c.nombre}`, 'alta', `La clave ${c.nombre} (${c.uso}) no anda: ${quien} contesta ${c.estado}${c.detalle ? ` ("${c.detalle}")` : ''}. ${ARREGLO_DE_CLAVE[c.proveedor]?.(c.nombre) ?? ''}`.trim());
  }
  for (const quien of ['locutora', 'locutor']) {
    const v = voces?.[quien];
    const cual = quien === 'locutora' ? 'de la locutora' : 'del locutor';
    const arreglo = 'Hay que crearla de nuevo (Actions → "Crear voces") y cambiar el identificador en CRITERIO-REDES.md (docs/11-OPERACION.md)';
    if (v?.existe === false) {
      de(`voz-${quien}`, 'alta', `Gemini ya no tiene la voz ${cual} (${VOCES[quien]}): las piezas que dice no salen. ${arreglo}.`);
      continue;
    }
    const t = Date.parse(v?.vence ?? '');
    if (!Number.isFinite(t)) continue;
    const dias = Math.ceil((t - ahora.getTime()) / 86400000);
    if (dias <= DIAS_DE_AVISO_ANTES) {
      const fecha = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(t));
      de(`vence-voz-${quien}`, dias <= 7 ? 'alta' : 'media', `${dias > 0 ? `Faltan ${dias} día(s): la` : 'YA VENCIÓ la'} voz ${cual} vence el ${fecha}. ${arreglo}; si vence, las piezas que dice dejan de salir.`);
    }
  }

  // --- publicaciones repetidas en Instagram (5/10/2026: cuatro copias del mismo posteo; la API no deja borrarlas, hay que hacerlo a mano)
  if (copiasEnInstagram?.length) {
    const lista = copiasEnInstagram.slice(0, 3).map((c) => `"${c.titulo}" (${c.copias} copias)`).join('; ');
    de('instagram-copias', 'alta', `Instagram tiene publicaciones repetidas: ${lista}. Dejá una y borrá las demás a mano desde el celular: el sistema no puede borrarlas.`);
  }

  // --- las corridas de GitHub
  for (const [nombre, lista] of Object.entries(corridas)) {
    if (!Object.values(WORKFLOWS_VIGILADOS).includes(nombre)) continue;
    const terminadas = lista.filter((r) => r.status === 'completed' && r.conclusion !== 'cancelled' && r.conclusion !== 'skipped');
    const ultima = terminadas[0];
    if (!ultima) continue;
    const fallas = terminadas.slice(0, 5).filter((r) => r.conclusion === 'failure').length;
    if (ultima.conclusion === 'failure') {
      // Con dos seguidas ya es 'alta' (en la web son 60 minutos sin publicar), y se dice qué paso falló y qué significa.
      const seguidas = terminadas.findIndex((r) => r.conclusion !== 'failure');
      const enFila = seguidas < 0 ? terminadas.length : seguidas;
      const queSignifica = QUE_SIGNIFICA_EL_PASO[ultima.paso] ? ` ${QUE_SIGNIFICA_EL_PASO[ultima.paso]}` : '';
      de(`falla-${nombre}`, enFila >= 2 || fallas >= 3 ? 'alta' : 'media', `"${nombre}" falló en su última corrida${ultima.paso ? `, en el paso "${ultima.paso}"` : ''} (${enFila} seguidas; ${fallas} de las últimas ${Math.min(5, terminadas.length)}).${queSignifica}`);
    }
  }

  // --- que haya un respaldo bueno reciente (el workflow "Respaldo" corre los domingos). Sin ninguna corrida todavía (recién armado), no se avisa.
  if (corridas.Respaldo?.length) {
    const buena = corridas.Respaldo.find((r) => r.status === 'completed' && r.conclusion === 'success');
    if (!buena || minutos(buena.createdAt, ahora) > LIMITES.minutosSinRespaldo) {
      de('respaldo-viejo', 'media', 'Hace más de 10 días que no hay un respaldo bueno (workflow "Respaldo" en GitHub Actions). Si se perdiera la cuenta de GitHub, se perdería todo.');
    }
  }

  // --- que los relojes estén corriendo (sólo de día: de noche no hay nada que hacer). Desde el 17/10/2026 el reloj de Cloudflare dispara
  // también "Auditoría IA" (cada hora de 7 a 23) y "Pistas" (cada 3 horas), que antes tenían horario de GitHub: si el reloj nuevo no se
  // subió o dejó de pedirlas, esto lo dice. Cada una se mira desde la hora en que ya tendría que haber corrido (Redes arranca 7:05).
  for (const [nombre, tope, desde, texto] of [
    ['Actualizar la web', LIMITES.minutosSinActualizar, 7, 'No hay corridas nuevas de "Actualizar la web": el reloj de Cloudflare pudo haber fallado (mirar sus ejecuciones en Workers → radar-balcarce-reloj).'],
    ['Redes', LIMITES.minutosSinReloj, 8, 'El reloj de Redes no corre: el reloj de Cloudflare pudo haber fallado (o la llave RELOJ_GITHUB_TOKEN dejó de servir), o el workflow está apagado.'],
    ['Auditoría IA', LIMITES.minutosSinAuditoriaIA, 9, 'La "Auditoría IA" no corre hace horas: la dispara el reloj de Cloudflare a los :41 de 7 a 23. ¿Se subió el reloj nuevo (workflow "Reloj de Cloudflare", a mano)? Mirar Workers → radar-balcarce-reloj.'],
    ['Pistas', LIMITES.minutosSinPistas, 7, 'La revisión de las "Pistas" no corre hace horas: la dispara el reloj de Cloudflare cada 3 horas (a los :23). ¿Se subió el reloj nuevo (workflow "Reloj de Cloudflare", a mano)? Mirar Workers → radar-balcarce-reloj.'],
  ]) {
    if (hora < desde || hora > 23) continue;
    const lista = corridas[nombre];
    if (!lista) continue;
    const ultima = lista.find((r) => r.status === 'completed' || r.status === 'in_progress' || r.status === 'queued');
    if (!ultima || minutos(ultima.createdAt, ahora) > tope) de(`reloj-${nombre}`, nombre === 'Actualizar la web' || nombre === 'Redes' ? 'alta' : 'media', texto);
  }

  // --- redes apagadas: con REDES_ACTIVAS sin prender no se publica nada y no se
  // escribe el libro, así que TODA pieza "falta". Es lo esperable: se dice una
  // vez por día en vez de avisar cada pieza como si fuera un problema.
  if (!redesActivas) {
    de('redes-apagadas', 'media', TEXTO_REDES_APAGADAS);
  }

  // --- las piezas fijas del día
  if (redesActivas && libro && Object.keys(libro).length) {
    for (const p of cronogramaDelDia(ahora)) {
      if (!PIEZAS_FIJAS.includes(p.nombre)) continue;
      const [h, m] = p.hora.split(':').map(Number);
      const cierre = h * 60 + m + ventanaDe(p.nombre);
      const ahoraMin = minutoDelDiaAR(ahora);
      if (ahoraMin < cierre + 15) continue; // todavía está a tiempo
      if (!yaPublicada(libro, 'instagram', claveDePieza(p.nombre, ahora))) {
        de(`pieza-${p.nombre}`, 'alta', `No salió la pieza "${p.nombre}" de las ${p.hora}, y ya se cerró su ventana.`);
      }
    }
  }

  // --- el contrato del día (redes/contrato.mjs)
  if (contrato) problemas.push(...problemasDelContrato(contrato, { redesActivas }));
  return problemas;
}

/** Las piezas fijas de Instagram que ya mira `evaluar` con su propia clave. */
const YA_VIGILADAS_EN_INSTAGRAM = ['clima-manana', 'farmacia', 'clima-noche'];

/**
 * Lo que el contrato del día (redes/contrato.mjs) tiene para decir:
 *
 *   · un duplicado en el libro es de prioridad ALTA y se avisa enseguida, sin
 *     esperar al cierre (dos publicaciones iguales en una página de 1 seguidor
 *     parecen un robot roto);
 *   · una pieza cuya ventana se cerró sin salir (los podcasts, sus historias y
 *     todo lo de Facebook, que antes nadie miraba) y una historia de un podcast
 *     cuyo reel ya salió: no se reintenta, así que no hay que esperar;
 *   · un posteo de Facebook sin su foto en Instagram.
 *
 * Los que ya mira `evaluar` (clima y farmacia en Instagram) no se repiten.
 * Los posteos que quedan cortos NO son un problema acá: pueden no haber tenido
 * candidatas; eso lo distingue el cierre de las 23:30.
 */
export function problemasDelContrato(contrato, { redesActivas = true } = {}) {
  const lista = [];
  for (const red of [contrato.facebook, contrato.instagram]) {
    for (const d of red.duplicadas) {
      lista.push({ clave: `duplicado-${red.red}-${d.claves.join('+')}`, nivel: 'alta', texto: `${red.nombre}: DUPLICADO. ${d.texto}. Revisá la página y borrá la copia (R26, docs/10-REGLAS-Y-PRUEBAS.md: una pieza por día).` });
    }
    // Con las redes apagadas lo que falta es lo esperable: lo dice `evaluar` una vez.
    if (!redesActivas) continue;
    for (const p of red.faltan) {
      if (red.red === 'instagram' && p.tipo === 'STORIES' && YA_VIGILADAS_EN_INSTAGRAM.includes(p.nombre) && p.grupo !== 'historia-podcast') continue;
      const que = p.grupo === 'reel' ? 'el reel' : 'la historia';
      lista.push({
        clave: `falta-${red.red}-${p.id}`,
        nivel: p.grupo === 'reel' || p.fase === 'no-se-reintenta' ? 'alta' : 'media',
        texto: p.fase === 'no-se-reintenta'
          ? `${red.nombre}: no salió ${que} de ${p.etiqueta} (su reel sí salió y la historia no se reintenta). Mirá el registro de "Redes": las historias de Meta aceptan hasta 60 segundos.`
          : `${red.nombre}: no salió ${que} de ${p.etiqueta} de las ${p.hora}, y ya se cerró su ventana. Si ese día no había notas para contar, es normal.`,
      });
    }
    // R-4 (8/10/2026): lo que el cronograma traía ese día además de lo fijo (efeméride, feriado, agenda, Participá, avisos de clima).
    for (const p of red.extrasFaltan ?? []) {
      lista.push({
        clave: `falta-${red.red}-${p.id}`, nivel: 'media',
        texto: `${red.nombre}: no salió ${p.tipo === 'REELS' ? 'el reel' : 'la historia'} de ${p.etiqueta} de las ${p.hora}, y ya se cerró su ventana. Si ese día había más de ocho historias, el tope pudo sacarla a propósito.`,
      });
    }
    if (red.posteos.sinEspejo.length) {
      lista.push({ clave: `sin-espejo-${red.red}`, nivel: 'media', texto: `Instagram: ${red.posteos.sinEspejo.length} posteo(s) de Facebook de hoy no tienen su foto en el feed (${red.posteos.sinEspejo.map((e) => e.titulo).join(' | ').slice(0, 90)}).` });
    }
  }
  return lista;
}

/**
 * Los problemas de ahora en la forma que se guarda en vigilancia.json (`abiertos`) para que el informe diario los lea: clave, nivel, texto y desde cuándo siguen.
 * `desde` se conserva mientras el problema siga abierto (por su clave); el texto puede cambiar entre vueltas ("hace 2,5 horas"), la clave no.
 */
export function problemasAbiertos(problemas = [], previos = [], ahora = new Date()) {
  const antes = new Map((previos ?? []).map((p) => [p.clave, p]));
  return problemas.map((p) => ({ clave: p.clave, nivel: p.nivel, texto: recortar(p.texto, 400), desde: antes.get(p.clave)?.desde ?? ahora.toISOString() }));
}

/** Cuáles de los problemas hay que avisar ahora (no repetir lo ya avisado). */
export function aAvisar(problemas, estado = {}, ahora = new Date()) {
  const previos = estado.avisos ?? {};
  return problemas.filter((p) => {
    const antes = previos[p.clave];
    const cadaHoras = p.clave === 'redes-apagadas' ? LIMITES.horasEntreAvisosDeRedesApagadas : LIMITES.horasEntreAvisos;
    return !antes || minutos(antes, ahora) >= cadaHoras * 60;
  });
}

/** El texto del mensaje de problemas. */
export function mensajeDeProblemas(problemas) {
  const alta = problemas.filter((p) => p.nivel === 'alta');
  const cab = alta.length ? '⚠️ Radar Balcarce: hay un problema' : 'ℹ️ Radar Balcarce: para mirar';
  return `${cab}\n\n${problemas.map((p) => `• ${p.texto}`).join('\n')}`;
}

/**
 * El resumen de las 21. Desde el 25/09 sale siempre, con o sin problemas, y
 * cuenta el día: notas, redes, piezas, lo que espera a una persona, los
 * problemas abiertos y las estadísticas.
 */
export function mensajeDelResumen({
  ahora, libro = {}, web, portada = {}, problemas = [], problemasArriba = false, estadisticas = '', redesActivas = true,
}) {
  return textoResumen({
    datos: datosDelDia({ ahora, portada, libro }), problemas, problemasArriba, estadisticas, web, redesActivas,
  });
}

/**
 * ¿Toca el cierre del día? Devuelve el día a cerrar (AAAA-MM-DD) o null.
 *
 * Una vez por día, a partir de las 23:30. Si la corrida de las 23:30 se
 * demoró y llegó pasada la medianoche, cierra el día de AYER (hasta las 3:00;
 * las historias de Meta duran 24 horas, así que todavía se las puede ver).
 * `estado.ultimoCierre` es el último día cerrado: no se repite.
 */
export function fechaDelCierre(ahora, estado = {}) {
  const minuto = minutoDelDiaAR(ahora);
  const hoy = diaAR(ahora);
  let dia = null;
  if (minuto >= CONTRATO_DIARIO.cierreMinutoDelDia) dia = hoy;
  else if (minuto < 3 * 60) dia = diaAR(new Date(ahora.getTime() - 86400e3));
  if (!dia || dia < CONTRATO_DESDE) return null;
  return estado.ultimoCierre && estado.ultimoCierre >= dia ? null : dia;
}

/**
 * El cierre del día: el informe contra el contrato y contra Meta. No manda
 * nada: devuelve qué decir.
 *
 *   ok: true   todo cuadra: no hay mensaje; la línea de "completos ✓" viaja
 *              dentro del próximo mensaje normal (planDeAvisos, `cierreOk`);
 *   ok: false  hay discrepancias: `texto` es el WhatsApp.
 *
 * Al cerrar se toma el día como terminado: lo que estaba "a tiempo" a las 23:30
 * ya no va a salir (nada sale al día siguiente).
 */
export function cierreDelDia({ fecha, ahora, libro, portada = null, meta = null }) {
  // El fin del día: las 24:00, cuando ya no puede salir nada más de esa fecha.
  const finDelDia = new Date(new Date(`${fecha}T23:59:59-03:00`).getTime() + 1000);
  const informe = informeDelDia({ libro, meta, fecha, ahora: ahora > finDelDia ? ahora : finDelDia, portada });
  return {
    fecha, informe, ok: informe.ok,
    texto: informe.ok ? '' : textoCierre(informe),
    linea: informe.ok ? lineaDeCierreCompleto(informe) : '',
  };
}

/** ¿Toca mandar el resumen? Una vez por día, a partir de las 21. */
export function tocaResumen(ahora, estado = {}) {
  return horaAR(ahora) >= LIMITES.horaDelResumen && estado.ultimoResumen !== diaAR(ahora);
}

/**
 * Todo lo que hay para decir en esta corrida, en orden de prioridad, y cómo
 * anotar cada cosa una vez avisada. Sale en UN solo mensaje (armarMensaje):
 * CallMeBot bloquea el número si se le manda de más.
 *
 *   1. los problemas nuevos (o que ya pasaron seis horas desde el aviso);
 *   2. una noticia de Balcarce muy importante que acaba de entrar;
 *   3. las notas nuevas que esperan a una persona (cada tres horas);
 *   4. el resumen de las 21, con las estadísticas; o, a las 9, las
 *      estadísticas solas;
 *   5. lo que salió en redes desde la corrida anterior.
 *
 * @returns {{ secciones: {clave:string, texto:string}[], anotar: (estado:object, incluidas:string[]) => void }}
 */
export function planDeAvisos({
  ahora, problemas = [], estado = {}, portada = {}, libro = {}, web = null,
  estadisticas = '', soloResumen = false, sitio = 'https://radarbalcarce.com', cierre = null, redesActivas = true,
  historia = {}, resumenDelDia = true,
}) {
  const secciones = [];
  const hechos = {};

  const nuevos = soloResumen ? [] : aAvisar(problemas, estado, ahora);
  if (nuevos.length) {
    secciones.push({ clave: 'problemas', texto: mensajeDeProblemas(nuevos) });
    hechos.problemas = (e) => { e.avisos ??= {}; for (const p of nuevos) e.avisos[p.clave] = ahora.toISOString(); };
  }

  // El cierre del día con discrepancias: prioridad alta, va detrás de los problemas.
  if (!soloResumen && cierre && !cierre.ok && cierre.texto) {
    secciones.push({ clave: 'cierre', texto: cierre.texto });
    hechos.cierre = (e) => { e.ultimoCierre = cierre.fecha; delete e.cierreOk; };
  }

  const importantes = soloResumen ? [] : importantesAAvisar(portada.notas, estado.importantes, ahora);
  if (importantes.length) {
    secciones.push({ clave: 'importantes', texto: textoImportantes(importantes, sitio) });
    hechos.importantes = (e) => { e.importantes = anotarImportantes(e.importantes, importantes, ahora); };
  }

  const pendientes = soloResumen ? null : pendientesAAvisar(portada.pendientes, estado.pendientes, ahora);
  if (pendientes) {
    secciones.push({ clave: 'pendientes', texto: textoPendientes(pendientes) });
    hechos.pendientes = (e) => { e.pendientes = anotarPendientes(portada.pendientes, ahora); };
  }

  // Desde el 15/10 (regla 176) el resumen de las 21, las estadísticas y el informe de notas del día los trae el informe diario por mail
  // (redes/informe-diario.mjs, 8:15 y 21:15): con `resumenDelDia: false` (lo que pasa main) no salen de acá, para no mandar lo mismo tres veces.
  if (soloResumen || (resumenDelDia && tocaResumen(ahora, estado))) {
    secciones.push({
      clave: 'resumen',
      texto: mensajeDelResumen({
        ahora, libro, web, portada, problemas, problemasArriba: nuevos.length > 0, estadisticas, redesActivas,
      }),
    });
    // El informe del día va detrás; si no entra en este mensaje, queda
    // pendiente para la corrida siguiente.
    hechos.resumen = (e) => { e.ultimoResumen = diaAR(ahora); e.informePendiente = diaAR(ahora); };
  } else if (estadisticas && resumenDelDia) {
    secciones.push({ clave: 'estadisticas', texto: estadisticas });
  }

  // El informe del día en notas (27/09): detrás del resumen, una vez por día.
  // Si no entró junto al resumen, sale en la corrida siguiente.
  const hoy = diaAR(ahora);
  const informeDeHoy = soloResumen || (resumenDelDia && (tocaResumen(ahora, estado) || estado.informePendiente === hoy));
  if (informeDeHoy) {
    const texto = textoInformeDelDia({ ahora, portada, libro, historia });
    if (texto) {
      secciones.push({ clave: 'informe', texto });
      hechos.informe = (e) => { e.ultimoInforme = hoy; delete e.informePendiente; };
    }
  }

  if (!soloResumen) {
    // La primera vez no hay marca: se mira la última hora, no todo el libro.
    const desde = estado.redes?.hasta ?? new Date(ahora.getTime() - 60 * 60000).toISOString();
    const red = novedadesEnRedes(libro, desde);
    if (red.items.length) {
      secciones.push({ clave: 'redes', texto: textoRedes(red.items) });
      hechos.redes = (e) => { e.redes = { hasta: red.hasta }; };
    }
  }

  // Si el cierre anterior salió limpio, no hay mensaje propio: la línea viaja
  // dentro del próximo mensaje normal que salga (nunca uno extra).
  if (!soloResumen && estado.cierreOk?.linea && secciones.length && !secciones.some((x) => x.clave === 'cierre')) {
    secciones.push({ clave: 'cierre-ok', texto: `✓ ${estado.cierreOk.linea}` });
    hechos['cierre-ok'] = (e) => { delete e.cierreOk; };
  }

  return {
    secciones,
    anotar(e, incluidas = []) { for (const c of incluidas) hechos[c]?.(e); },
  };
}


// ------------------------------------------------------------ lo que baja datos

async function pedir(url, opciones = {}) {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(15000), ...opciones });
  } catch {
    return null;
  }
}

/** Los nombres de los medios que no deben aparecer arriba de un título. */
export const MEDIOS = ['Puntonueve', 'Punto Nueve', 'La Vanguardia', 'Infórmese', 'Informese', 'Radio Gabal', 'News Balcarce', 'El Diario', 'Sendero', 'Clarín', 'Infobae', 'La Nación', 'Página 12', 'Ámbito', 'Olé', 'Minuto Uno', 'Motorsport', 'Carburando', '0223', 'La Capital', 'Retrato de Hoy'];

/**
 * Mira el HTML de la portada y devuelve qué encontró de lo que se pidió sacar.
 * Sólo se buscan las cabeceras de las notas (class="chapa-nota"), no el texto:
 * un titular puede nombrar a un medio sin que sea una fuente en el encabezado.
 */
export function revisarPortada(html) {
  const chapas = [...String(html).matchAll(/<div class="chapa-nota"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => m[1].replace(/<[^>]+>/g, ' '));
  const enChapa = MEDIOS.filter((m) => chapas.some((c) => c.toLowerCase().includes(m.toLowerCase())));
  const visible = String(html).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ');
  return {
    // Con palabra entera: "sin hora" suelto encontraba "sin horario" (por
    // ejemplo, "atención sin horario de cierre") y avisaba en falso.
    laVimos: /\bla vimos hace\b|\bsin hora\b/i.test(visible),
    horaFarmacia: /turno termina a las|termina a las \d/i.test(visible),
    fuentesEnChapa: enChapa.join(', '),
  };
}

/**
 * Cuándo se armó la web por última vez, según el sitemap.
 *
 * Es la fecha MÁS NUEVA de todas las entradas, no la de la primera. La primera
 * (la portada) lleva la fecha de la nota más nueva, no la del deploy: el 25/09
 * el vigilante avisó "la web no se actualiza hace 2,5 horas" con la web
 * armándose cada media hora, sólo porque la última nota publicada tenía 2,5
 * horas (con las notas incompletas y las internacionales esperando, salen
 * menos notas). Las páginas de servicio (farmacias, dólar, agenda…) llevan la
 * hora del deploy, así que el máximo es siempre el deploy.
 */
export function ultimaModificacion(xml = '') {
  const fechas = [...String(xml).matchAll(/<lastmod>([^<]+)<\/lastmod>/g)]
    .map((m) => ({ texto: m[1], t: new Date(m[1]).getTime() }))
    .filter((f) => Number.isFinite(f.t));
  if (!fechas.length) return null;
  return fechas.reduce((a, b) => (b.t > a.t ? b : a)).texto;
}

export async function observar({ sitio, repo, token, ahora = new Date(), env = process.env }) {
  const portada = await pedir(`${sitio}/sitemap.xml`);
  let actualizado = null;
  if (portada?.ok) {
    actualizado = ultimaModificacion(await portada.text());
  }
  const inicio = await pedir(`${sitio}/`);
  const html = inicio?.ok ? await inicio.text() : '';
  const www = await pedir(sitio.replace('://', '://www.'), { redirect: 'manual' });

  const corridas = {};
  if (token && repo) {
    const enLaNube = new Set(String(env.WORKFLOWS_EN_LA_NUBE ?? '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean));
    for (const archivo of Object.keys(WORKFLOWS_VIGILADOS)) {
      // 18/10/2026: lo que ya corre en Cloudflare (WORKFLOWS_EN_LA_NUBE, la misma lista que NUBE en el reloj) no deja corridas en GitHub: no se busca
      // ni se avisa que "el reloj no corre"; de eso se ocupa el vigilante de Cloudflare, que mira el estado de la nube (infra/vigilante-cloudflare/).
      if (enLaNube.has(archivo)) continue;
      const r = await pedir(`https://api.github.com/repos/${repo}/actions/workflows/${archivo}/runs?per_page=6`, {
        headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' },
      });
      if (!r?.ok) continue;
      const j = await r.json();
      const lista = (j.workflow_runs ?? []).map((x) => ({ id: x.id, conclusion: x.conclusion, status: x.status, createdAt: x.created_at }));
      // Si la última terminada falló, qué paso fue ("Probar que nada se rompió", "Compilar el sitio"…): el aviso lo dice y no hay que abrir GitHub para enterarse.
      const falla = lista.find((x) => x.status === 'completed' && x.conclusion !== 'cancelled' && x.conclusion !== 'skipped');
      if (falla?.conclusion === 'failure') {
        const jr = await pedir(`https://api.github.com/repos/${repo}/actions/runs/${falla.id}/jobs`, { headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' } });
        if (jr?.ok) {
          const jobs = (await jr.json()).jobs ?? [];
          falla.paso = jobs.flatMap((job) => job.steps ?? []).find((s) => s.conclusion === 'failure')?.name ?? null;
        }
      }
      const nombre = WORKFLOWS_VIGILADOS[archivo];
      corridas[nombre] = lista;
    }
  }
  // Lo último que hay en el feed de Instagram, para encontrar copias repetidas. Si Meta no contesta, no se avisa nada (no es un problema de la web).
  let copiasEnInstagram = [];
  if (env.META_TOKEN) {
    try {
      const api = crearCliente({ token: env.META_TOKEN, paginaId: PAGINA_DE_FACEBOOK });
      copiasEnInstagram = copiasRepetidas(await api.publicacionesRecientesDeInstagram({ limite: 50 }), { ahora });
    } catch { /* sin datos */ }
  }
  const { claves, voces } = await revisarClaves({ env });
  // El archivo permanente, sólo si está prendido (variable R2_ARCHIVO): su Worker muestra el estado de la última corrida.
  let archivoR2 = null;
  if (String(env.R2_ARCHIVO ?? '').trim()) {
    const r = await pedir(String(env.ARCHIVO_ESTADO_URL ?? '').trim() || ESTADO_DEL_ARCHIVO, { headers: { 'cache-control': 'no-cache' } });
    let estado = null;
    try { estado = r?.ok ? await r.json() : null; } catch { estado = null; }
    archivoR2 = { http: r?.status ?? 0, estado };
  }
  return {
    archivoR2,
    copiasEnInstagram,
    ahora,
    web: { estado: inicio?.status ?? 0, actualizado: portada?.ok ? actualizado : null },
    www: www ? { redirige: [301, 302, 307, 308].includes(www.status) } : null,
    contenido: html ? { home: revisarPortada(html) } : null,
    corridas,
    claves,
    voces,
  };
}

/**
 * Una vuelta del vigilante. `argv`, `env` y `raiz` entran por parámetro para que corra igual en la línea de comandos, en GitHub y en un Worker de
 * Cloudflare (infra/tareas-cloudflare/, 18/10/2026), donde no hay `process.argv` ni `process.exit`: termina con `return`.
 */
export async function main({ argv = process.argv.slice(2), env = process.env, raiz = null } = {}) {
  const RAIZ = raiz ?? raizDelProyecto(env, import.meta.dirname);
  const ESTADO = path.join(RAIZ, 'web', 'data', 'vigilancia.json');
  const ESTADISTICAS = path.join(RAIZ, 'web', 'data', 'estadisticas.json');
  const ESTADISTICAS_DE_PIEZAS = path.join(RAIZ, 'web', 'data', 'estadisticas-piezas.json');
  const sinAvisar = argv.includes('--sin-avisar');
  // Manda UN WhatsApp con el resumen del día tal como saldría a las 21 (con
  // las estadísticas medidas en el momento), para ver cómo llega. No guarda
  // nada: ni el estado de los avisos ni la medición.
  const probarResumen = argv.includes('--probar-resumen');
  // Corre el cierre del día de hoy contra Meta y muestra el informe y el
  // WhatsApp que saldría. No manda nada y no guarda nada.
  const probarCierre = argv.includes('--probar-cierre');

  const sitio = (env.SITIO ?? 'https://radarbalcarce.com').replace(/\/$/, '');
  const ahora = new Date();
  const libro = leer(path.join(RAIZ, 'web', 'data', 'redes.json'), {});
  const estado = leer(ESTADO, { avisos: {} });
  estado.avisos ??= {};

  const obs = await observar({ sitio, repo: env.GITHUB_REPOSITORY, token: env.GITHUB_TOKEN, ahora, env });
  // Cuántas notas de las últimas 24 horas tienen cuerpo (de lo ya publicado).
  const portada = leer(path.join(RAIZ, 'web', 'data', 'portada.json'), { notas: [] });
  const desde = Date.now() - 24 * 3600e3;
  const recientes = (portada.notas ?? []).filter((n) => new Date(n.fecha).getTime() >= desde);
  const cuerpos = { total: recientes.length, conCuerpo: recientes.filter((n) => n.cuerpo).length };
  const auditoria = leer(path.join(RAIZ, 'web', 'data', 'auditoria.json'), null);
  const contrato = contratoDelDia({ libro, ahora, portada });
  const redesActivas = redesPrendidas(env);
  if (!redesActivas) console.log('  Las redes están apagadas (REDES_ACTIVAS): no se avisa pieza por pieza.');
  const diasArmados = Object.keys(leer(path.join(RAIZ, 'web', 'data', 'efemerides-piezas.json'), {})?.dias ?? {}).sort();
  const vigencias = Object.values(leer(path.join(RAIZ, 'reels', 'fijas', 'vigencia.json'), {})).map((v) => v?.hasta).filter(Boolean).sort();
  const efemerides = { ultimoDia: diasArmados.at(-1) ?? null, fijasHasta: vigencias[0] ?? null };
  const problemas = evaluar({
    ...obs, libro, auditoria, contrato, redesActivas, efemerides, contenido: { ...(obs.contenido ?? {}), cuerpos },
    puntosWeb: leer(ESTADISTICAS, { puntos: [] })?.puntos ?? [],
  });

  if (probarCierre) {
    const meta = await consultarMeta({ ahora, dias: 2 });
    const c = cierreDelDia({ fecha: diaAR(ahora), ahora, libro, portada, meta });
    console.log(textoInforme(c.informe));
    console.log(c.ok ? `
  Saldría (dentro del próximo mensaje normal): ${c.linea}` : `
  Saldría este WhatsApp (${c.texto.length} caracteres):

${c.texto}`);
    return;
  }

  // Lo que tiene página: en el sitio (Cloudflare Pages, con su tope de archivos) y, aparte, en el archivo permanente (R2, sin tope).
  const enElSitio = (leer(path.join(RAIZ, 'web', 'data', 'archivo.json'), { notas: [] }).notas ?? []).length;
  const r2 = obs.archivoR2?.estado;
  console.log(`  Notas con página: ${enElSitio} en el sitio${r2 ? ` · ${r2.notas ?? '?'} guardadas en el archivo permanente (R2; última corrida ${r2.cuando}, ${r2.ok ? 'bien' : 'con problemas'})` : obs.archivoR2 ? ' · archivo permanente: sin estado' : ' · archivo permanente: apagado (sin R2_ARCHIVO)'}.`);
  console.log(`  ${problemas.length ? `${problemas.length} problema(s):` : 'Todo en orden.'}`);
  for (const p of problemas) console.log(`   [${p.nivel}] ${p.texto}`);

  // Los avisos salen por mail (Worker de Cloudflare, VIGILANTE_TOKEN) y, si el mail no sale o no hay token, por WhatsApp (regla 173).
  const telefono = env.WHATSAPP_TELEFONO;
  const apikey = env.WHATSAPP_APIKEY;
  const puedeAvisar = !sinAvisar && (hayMail(env) || hayWhatsApp(env));
  if (!sinAvisar && !puedeAvisar) console.log('  (no hay VIGILANTE_TOKEN ni WHATSAPP_TELEFONO / WHATSAPP_APIKEY: no se avisa por ningún lado)');

  let cambio = false;

  // --- las estadísticas: a las 9 y a las 21 (o ahora, si es la prueba)
  const historia = leer(ESTADISTICAS, { puntos: [] });
  historia.puntos ??= [];
  let textoStats = '';
  if (probarResumen || tocaMedir(ahora, estado)) {
    console.log('  Midiendo las estadísticas…');
    const { punto, dias } = await medir({ env, ahora });
    const turno = turnoDeMedicion(ahora);
    textoStats = textoEstadisticas({
      punto, puntos: historia.puntos, ahora, nombreDeCamino: nombresDeCaminos(portada.notas),
      titulo: turno?.endsWith('/9') ? '📊 Estadísticas de la mañana' : '📊 Estadísticas',
    });
    if (!probarResumen && !sinAvisar) {
      historia.puntos = agregarPunto(historia.puntos, punto);
      if (dias) historia.dias = mezclarDias(historia.dias, dias);
      fs.writeFileSync(ESTADISTICAS, `${JSON.stringify(historia, null, 2)}\n`);
      estado.ultimaMedicion = turno;
      cambio = true;
    }
  }

  // --- los números de cada pieza (8/10): cada publicación se mide una vez, cuando ya tiene números casi finales (redes/estadisticas-piezas.mjs).
  // Nunca frena nada: si Meta no da una métrica, se anota y se sigue.
  if (redesActivas && env.META_TOKEN && !probarResumen && !sinAvisar) {
    try {
      const r = await medirPiezas({ token: env.META_TOKEN, libro, previo: leer(ESTADISTICAS_DE_PIEZAS, {}), ahora });
      if (r.cambio) {
        fs.writeFileSync(ESTADISTICAS_DE_PIEZAS, `${JSON.stringify(r.archivo, null, 1)}\n`);
        cambio = true;
        console.log(`  Se midieron ${r.midieron} publicaciones (estadísticas por pieza).`);
      }
      for (const f of r.faltan.slice(0, 6)) console.log(`  (estadísticas por pieza) ${f}`);
    } catch (e) { console.log(`  (estadísticas por pieza) no se pudo medir: ${e.message}`); }
  }

  // --- el cierre del día (23:30): contra lo que Meta tiene de verdad
  let cierre = null;
  const diaDelCierre = probarResumen ? null : fechaDelCierre(ahora, estado);
  if (diaDelCierre && !redesActivas) {
    // Sin publicar no hay nada que cerrar contra Meta: se anota el día y ya.
    console.log(`  Cierre del ${diaDelCierre} salteado: las redes están apagadas.`);
    estado.ultimoCierre = diaDelCierre;
    cambio = true;
  } else if (diaDelCierre) {
    console.log(`  Cerrando el día ${diaDelCierre} contra Meta…`);
    const meta = await consultarMeta({ ahora, dias: 2 });
    cierre = cierreDelDia({ fecha: diaDelCierre, ahora, libro, portada, meta });
    console.log(textoInforme(cierre.informe).split('\n').map((l) => `    ${l}`).join('\n'));
    if (cierre.ok && !sinAvisar) {
      // Nada que avisar: se anota el día y la línea espera al próximo mensaje normal.
      estado.ultimoCierre = diaDelCierre;
      estado.cierreOk = { fecha: diaDelCierre, linea: cierre.linea };
      cambio = true;
    }
  }
  // Una línea de "todo bien" que nunca salió y ya es vieja no sirve: se descarta.
  if (estado.cierreOk && diaAR(new Date(ahora.getTime() - 3 * 86400e3)) > estado.cierreOk.fecha) { delete estado.cierreOk; cambio = true; }

  // --- un solo mensaje con todo lo que haya para decir
  const plan = planDeAvisos({
    ahora, problemas, estado, portada, libro, web: obs.web, estadisticas: textoStats, soloResumen: probarResumen, sitio, cierre,
    redesActivas, historia: leer(path.join(RAIZ, 'web', 'data', 'notas-por-dia.json'), { dias: {} }),
    resumenDelDia: false,
  });
  const { texto, incluidas } = armarMensaje(plan.secciones);
  const afuera = plan.secciones.map((s) => s.clave).filter((c) => !incluidas.includes(c));
  if (texto) {
    console.log(`\n  Mensaje de esta corrida (${incluidas.join(', ')}; ${texto.length} caracteres):\n`);
    console.log(texto.split('\n').map((l) => `    ${l}`).join('\n'));
    if (afuera.length) console.log(`\n  No entró en el mensaje (sale en la corrida siguiente): ${afuera.join(', ')}`);
  } else {
    console.log('  Nada para avisar.');
  }
  if (texto && puedeAvisar) {
    // La clave y el nivel son para el mail: el nivel es "alta" si el mensaje lleva un problema grave. La clave no se manda: el vigilante ya
    // decide solo cuándo repetir (estado.avisos), y una clave del Worker taparía un aviso distinto con el mismo nombre.
    const nivel = incluidas.includes('problemas') && problemas.some((p) => p.nivel === 'alta') ? 'alta' : 'info';
    // El asunto de un mensaje de problemas dice cuál es (si no, saldría un "hay un problema" pelado); los demás toman la primera línea del texto.
    const primero = problemas.find((p) => p.nivel === 'alta') ?? problemas[0];
    const asunto = incluidas[0] === 'problemas' && primero ? `${nivel === 'alta' ? 'Hay un problema' : 'Para mirar'}: ${recortar(primero.texto, 90)}` : undefined;
    const r = await avisar({ asunto, texto, nivel }, { env });
    if (r.ok) console.log(`  Aviso enviado por ${r.via === 'mail' ? 'mail' : 'WhatsApp (el mail no salió)'}.${r.via === 'whatsapp' ? ` Motivo del mail: ${sinSecretos(r.motivo, apikey, telefono)}` : ''}`);
    else console.log(`  No se pudo avisar: ${sinSecretos(r.motivo, apikey, telefono)}`);
    if (r.ok && !probarResumen) { plan.anotar(estado, incluidas); cambio = true; }
  }
  // Lo que está abierto ahora, para que el informe diario (redes/informe-diario.mjs) lo cuente sin volver a mirar todo. Sólo se reescribe si cambia.
  if (!probarResumen && !sinAvisar) {
    const abiertos = problemasAbiertos(problemas, estado.abiertos, ahora);
    if (estado.abiertos === undefined || JSON.stringify(abiertos) !== JSON.stringify(estado.abiertos)) { estado.abiertos = abiertos; cambio = true; }
  }
  // Lo que se arregló deja de estar "avisado": si vuelve a fallar, se avisa de nuevo.
  if (!probarResumen) {
    for (const clave of Object.keys(estado.avisos)) {
      if (!problemas.some((p) => p.clave === clave)) { delete estado.avisos[clave]; cambio = true; }
    }
  }
  if (cambio && !probarResumen) fs.writeFileSync(ESTADO, `${JSON.stringify(estado, null, 2)}\n`);
  // Los problemas se anotan arriba de la corrida, pero la corrida termina
  // bien: el vigilante HIZO su trabajo. Antes terminaba con error cuando
  // encontraba algo grave, y Actions pintaba de rojo "Vigilancia" como si
  // la que estuviera rota fuera ella (auditoría del 25/09).
  for (const p of problemas) console.log(anotacion(p));
}


/**
 * La línea que GitHub Actions muestra como aviso amarillo arriba de la
 * corrida. Los saltos de línea y el "%" se escapan como pide GitHub, si no,
 * el aviso se corta en la primera línea.
 */
export function anotacion(problema) {
  const escapar = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  // En el título (una "propiedad") también se escapan ":" y ",".
  const propiedad = (s) => escapar(s).replace(/:/g, '%3A').replace(/,/g, '%2C');
  const titulo = problema.nivel === 'alta' ? 'Vigilancia: problema' : 'Vigilancia: para mirar';
  return `::warning title=${propiedad(titulo)}::${escapar(problema.texto)}`;
}

// Si el que falla es el vigilante mismo (no pudo correr), eso sí termina con
// error: es lo único que tiene que pintar de rojo esta corrida.
if (process.argv[1] && process.argv[1].endsWith('vigilar.mjs')) {
  await main().then(() => process.exit(0), (e) => {
    console.error(`El vigilante no pudo terminar: ${e?.stack ?? e}`);
    process.exit(1);
  });
}
