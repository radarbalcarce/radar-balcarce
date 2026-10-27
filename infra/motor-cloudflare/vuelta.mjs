// La vuelta del motor, en Cloudflare (18/10/2026, mudanza a Cloudflare: docs/etapa-10-operacion/MIGRACION-A-CLOUDFLARE.md).
//
// Es lo que hace .github/workflows/actualizar.yml ("Actualizar la web"), pero como UN programa de Node que corre dentro de Workers Builds, la
// máquina de compilación de Cloudflare (6.000 minutos por mes incluidos en el plan que ya se paga): lee las fuentes, arma los datos, escribe con IA,
// verifica, compila Next y sube a Cloudflare Pages. Lo despierta el reloj (`radar-balcarce-reloj`) con un "deploy hook" de Workers Builds.
//
//   Build command de Workers Builds:   node infra/motor-cloudflare/vuelta.mjs
//   Deploy command:                    node infra/motor-cloudflare/listo.mjs    (la vuelta ya subió el sitio; ese paso no hace nada)
//
// DIFERENCIAS CON EL WORKFLOW (todo lo demás es igual, paso por paso):
//   · Los datos se guardan por la API de GitHub (infra/compartido/github.mjs), no con `git push`: no depende de que el clon traiga credenciales
//     y no gasta minutos de Actions. El mismo mensaje de siempre, el mismo `main`, los mismos archivos (archivos.mjs).
//   · La memoria entre vueltas (.cache/) y el candado van a R2 (estado-r2.mjs), no a la caché de Actions ni a `concurrency`.
//   · Antes de empezar, si se pasó del presupuesto de minutos, el reloj ni la despierta (presupuesto.mjs).
//
// INTERRUPTORES: `MOTOR_SIMULAR=Si` (o --simular) hace todo menos guardar en GitHub, subir a Pages y escribir en R2 (ensayo). Sin las variables de
// R2 corre igual, sin memoria ni candado, y lo dice. Lo que en GitHub eran `vars.*` y `secrets.*` son acá variables y secretos del build de
// Workers Builds (lista exacta en docs/etapa-10-operacion/PLAN-DE-CAMBIO.md).
//
// Sólo Node 24 y los programas del proyecto. Sin dependencias propias.

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { crearGithub } from '../compartido/github.mjs';
import { leerPausa, lectorDeS3, textoDeLaPausa } from '../compartido/pausa.mjs';
import { clienteR2 } from '../compartido/r2-s3.mjs';
import { fotografiar, cambiosDesde } from './archivos.mjs';
import {
  fotosEnR2Activas, indiceDeFotos, guardarIndice, rutaDelIndice, hidratar, lectorDeR2, fotosQueNecesitan, separarCambios, subirFotos,
  fotosRetiradasParaBorrar, idsRetiradosDe, claveDeFoto,
} from '../compartido/fotos-r2.mjs';
import {
  restaurarCache, guardarCache, tomarCandado, soltarCandado, anotarVuelta,
} from './estado-r2.mjs';
import { minutosDeMasPorVuelta, cicloDiaDe } from './presupuesto.mjs';
import { sincronizarTarjetas } from './tarjetas-r2.mjs';
import { configuracionDeR2 as configuracionDeTarjetas } from '../compartido/tarjetas-r2.mjs';
import { hayQueRecompilar } from '../../web/scripts/recompilar.mjs';
import { huellaDelSitio, decidirSiCompilar, escribirLaHuella, huellaPublicada as leerHuellaPublicada } from '../../web/scripts/huella-del-sitio.mjs';
import { avisar } from '../../redes/avisar-por-mail.mjs';

export const VERSION_DE_WRANGLER = '4.139.0';
export const REPOSITORIO = 'radarbalcarce/radar-balcarce';
/** Workers Builds corta a los 20 minutos: la vuelta se rinde antes y lo dice. */
export const MINUTOS_MAXIMOS = 18;

const RAIZ = path.join(import.meta.dirname, '..', '..');

const si = (v) => /^\s*(si|sí|true|1)\s*$/i.test(String(v ?? ''));

/** Los avisos `::warning title=Fuente caída::Nombre: error` que imprime el armado, como { title, message } (el formato de las anotaciones de GitHub). */
export function anotacionesDe(texto) {
  const salida = [];
  for (const linea of String(texto).split(/\r?\n/)) {
    const m = linea.match(/^::warning title=([^:]*)::(.*)$/);
    if (m) salida.push({ title: m[1].trim(), message: m[2].trim() });
  }
  return salida.slice(0, 100);
}

/** Un comando de verdad. Devuelve { codigo } (y `anotaciones` si se pidió `capturar`). Nunca tira por un código de salida: quien llama decide. */
export function ejecutarReal(comando, args, {
  cwd = RAIZ, env = process.env, minutos = MINUTOS_MAXIMOS, capturar = false,
} = {}) {
  return new Promise((resolver) => {
    const hijo = spawn(comando, args, { cwd, env, stdio: capturar ? ['inherit', 'pipe', 'inherit'] : 'inherit', shell: process.platform === 'win32' /* npm y npx son .cmd en Windows (el ensayo en la PC); en Workers Builds, Linux, sin shell */ });
    let visto = '';
    if (capturar) hijo.stdout.on('data', (d) => { process.stdout.write(d); visto = (visto + d).slice(-400000); });
    const reloj = setTimeout(() => { hijo.kill('SIGKILL'); }, minutos * 60000);
    hijo.on('error', (e) => { clearTimeout(reloj); console.error(`No se pudo correr ${comando}: ${e.message}`); resolver({ codigo: 127 }); });
    hijo.on('close', (codigo) => { clearTimeout(reloj); resolver({ codigo: codigo ?? 1, ...(capturar ? { anotaciones: anotacionesDe(visto) } : {}) }); });
  });
}

/** El texto "18/10 10:00", en hora de Balcarce. */
export function fechaCorta(ahora = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(ahora).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month} ${String(Number(p.hour) % 24).padStart(2, '0')}:${p.minute}`;
}

/** Lo que la vuelta necesita, leído del entorno (variables y secretos del build). */
export function configurar(env = process.env) {
  const cuenta = env.CLOUDFLARE_ACCOUNT_ID;
  const bucket = (env.R2_MOTOR ?? '').trim();
  return {
    simular: si(env.MOTOR_SIMULAR),
    sitio: (env.SITIO ?? 'https://radarbalcarce.com').replace(/\/$/, ''),
    proyecto: (env.CLOUDFLARE_PROJECT ?? '').trim() || 'radar-balcarce',
    repo: (env.MOTOR_REPOSITORIO ?? '').trim() || REPOSITORIO,
    token: env.RADAR_GITHUB_TOKEN,
    r2: cuenta && bucket && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY
      ? { cuenta, bucket, accessKey: env.R2_ACCESS_KEY_ID, secretKey: env.R2_SECRET_ACCESS_KEY } : null,
    archivoR2: (env.R2_ARCHIVO ?? '').trim(),
    // FOTOS_EN_R2 ("Si"): las fotos nuevas van a R2 (el depósito del archivo) y no al commit. Vacía, todo como siempre. docs/etapa-10-operacion/FOTOS-EN-R2.md
    fotosEnR2: fotosEnR2Activas(env),
    r2Fotos: cuenta && (env.R2_ARCHIVO ?? '').trim() && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY
      ? { cuenta, bucket: (env.R2_ARCHIVO ?? '').trim(), accessKey: env.R2_ACCESS_KEY_ID, secretKey: env.R2_SECRET_ACCESS_KEY } : null,
    id: env.WORKERS_CI_BUILD_UUID || env.MOTOR_ID || `vuelta-${Date.now()}`,
    // TARJETAS_EN_R2 ("Si", regla 312): la memoria de tarjetas vive en R2 (objetos sueltos por huella) y la compilación baja sólo las que pide.
    tarjetasEnR2: configuracionDeTarjetas(env) !== null,
    // Lo que se le suma a cada vuelta en el registro de minutos por lo que ella no ve de sí misma (MOTOR_MINUTOS_DE_MAS; 0,5 si no está).
    minutosDeMas: minutosDeMasPorVuelta(env),
    // El día en que arranca el ciclo de facturación de Cloudflare (MOTOR_CICLO_DIA; 11 si no está): el registro de minutos es por ciclo (regla 315).
    cicloDia: cicloDiaDe(env),
  };
}

/**
 * Una vuelta entera. Todo lo de afuera entra por parámetro, así se prueba sin red, sin disco real y sin gastar nada.
 * Devuelve { ok, omitida?, motivo?, pasos, segundos, commit? }; si algo salió mal, ok es false (el programa sale con error).
 */
export async function vuelta({
  env = process.env, raiz = RAIZ, ejecutar = ejecutarReal, github = null, r2 = null, r2Fotos = null, ahora = () => new Date(), log = console.log,
  // Regla 304: cómo leer la huella de lo publicado (sitio => texto | null). Sin esto la vuelta compila y sube siempre, como antes (las pruebas no
  // tocan la red); el programa de verdad lo pasa (abajo).
  huellaPublicada = null,
} = {}) {
  const cfg = configurar(env);
  const inicio = ahora().getTime();
  const pasos = {};
  const entorno = { ...env, TZ: 'America/Argentina/Buenos_Aires', RADAR_MOTOR: 'cloudflare' };
  const web = path.join(raiz, 'web');
  const gh = github ?? (cfg.token && !cfg.simular ? crearGithub({ token: cfg.token, repo: cfg.repo }) : null);
  const deposito = r2 ?? (cfg.r2 ? clienteR2(cfg.r2) : null);
  // El depósito de las fotos (el del archivo permanente), sólo con el interruptor prendido y sin simulacro.
  const depositoFotos = cfg.fotosEnR2 && !cfg.simular ? (r2Fotos ?? (cfg.r2Fotos ? clienteR2(cfg.r2Fotos) : null)) : null;
  let tenemosElCandado = false;
  let resultado = { ok: false, pasos };
  // ¿Esta vuelta compiló el sitio? (null: no llegó a decidirlo). Sirve para el registro de minutos (regla 312).
  let compilo = null;

  let anotaciones = null;
  const correr = async (nombre, comando, args, { cwd = raiz, extra = {}, puedeFallar = false, capturar = false } = {}) => {
    const t0 = ahora().getTime();
    log(`\n▶ ${nombre}`);
    const salida = await ejecutar(comando, args, { cwd, env: { ...entorno, ...extra }, minutos: Math.max(1, MINUTOS_MAXIMOS - (t0 - inicio) / 60000), capturar });
    const { codigo } = salida;
    if (capturar && Array.isArray(salida.anotaciones)) anotaciones = salida.anotaciones;
    pasos[nombre] = { ok: codigo === 0, segundos: Math.round((ahora().getTime() - t0) / 1000) };
    if (codigo !== 0) {
      log(`✖ ${nombre} salió con código ${codigo}${puedeFallar ? ' (no frena la vuelta)' : ''}`);
      if (!puedeFallar) throw new Error(`falló «${nombre}» (código ${codigo})`);
    }
    return codigo === 0;
  };

  try {
    log(`Vuelta ${cfg.id}${cfg.simular ? ' · SIMULACRO (no guarda ni sube nada)' : ''}`);
    if (!cfg.simular && !gh) throw new Error('falta RADAR_GITHUB_TOKEN (la llave de GitHub para guardar los datos): sin eso no se puede guardar nada');
    if (!cfg.simular && !deposito) log('(sin las variables de R2: corre sin memoria entre vueltas ni candado; el cruce de medios se rearma solo con los índices)');

    // 0. LA PAUSA GENERAL (24/10/2026, regla 317): si una persona frenó todo desde el panel del celular, la vuelta termina en segundos, antes de instalar nada, tomar el candado
    // o leer una sola fuente: no entra ninguna nota nueva y no se gasta IA. El sitio ya publicado sigue sirviéndose. El reloj ya no la pide en pausa; esto cubre la que
    // arranca igual (un push al repositorio, el botón de Workers Builds). Si el depósito no contesta no se asume pausa.
    if (deposito && !cfg.simular) {
      const pausa = await leerPausa(lectorDeS3(deposito));
      if (pausa.pausada) {
        const motivo = textoDeLaPausa(pausa, ahora());
        log(`${motivo}. Esta vuelta no arma ni publica nada.`);
        resultado = { ok: true, omitida: true, enPausa: true, motivo, pasos, segundos: Math.round((ahora().getTime() - inicio) / 1000) };
        return resultado;
      }
      if (pausa.lecturaFallida) log('(no se pudo leer si la pausa general está prendida; se sigue como si no lo estuviera)');
    }

    // 1. El candado, lo primero: si hay otra vuelta andando, esta termina en segundos y no gasta la compilación.
    if (deposito && !cfg.simular) {
      const c = await tomarCandado(deposito, { id: cfg.id, ahora: ahora() });
      if (!c.ok) {
        log(`Otra vuelta está andando: ${c.motivo}. Esta se saltea.`);
        resultado = { ok: true, omitida: true, motivo: c.motivo, pasos, segundos: Math.round((ahora().getTime() - inicio) / 1000) };
        return resultado;
      }
      tenemosElCandado = true;
      if (c.tomado) log(`(${c.tomado})`);
    }

    // 2. Las dependencias (el armado usa resvg y ffmpeg de reels/ y react de web/lib). Workers Builds ya instala las de la raíz si encuentra el package.json.
    const instalar = async (cwd, nombre) => {
      if (fs.existsSync(path.join(cwd, 'node_modules'))) { pasos[nombre] = { ok: true, segundos: 0, saltado: true }; return; }
      for (let intento = 1; intento <= 3; intento += 1) {
        if (await correr(`${nombre}${intento > 1 ? ` (intento ${intento})` : ''}`, 'npm', ['ci', '--no-audit', '--no-fund'], { cwd, puedeFallar: intento < 3 })) return;
      }
    };
    await instalar(raiz, 'Instalar');
    await instalar(web, 'Instalar (web)');

    // 3. El núcleo legal de las pruebas: si falla, no se arma ni se publica nada y se avisa (hallazgo M1 de la auditoría del 15/10/2026).
    try {
      // Las pruebas corren sin las claves reales (en GitHub tampoco las ven): con una clave puesta, algunas llamarían de verdad a la IA.
      const sinClaves = Object.fromEntries(['GEMINI_API_KEY_REDACCION', 'GEMINI_API_KEY_REDES', 'GEMINI_API_KEY_RESPALDO', 'GEMINI_API_KEY_CLASIFICACION', 'GROQ_API_KEY', 'MISTRAL_API_KEY', 'OPENROUTER_API_KEY', 'TAVILY_API_KEY', 'VIGILANTE_TOKEN', 'WHATSAPP_TELEFONO', 'WHATSAPP_APIKEY'].map((k) => [k, '']));
      await correr('Núcleo legal de las pruebas', 'npm', ['run', 'test:nucleo'], { extra: sinClaves });
    } catch (e) {
      if (!cfg.simular) {
        const r = await avisar({
          asunto: 'Falló el núcleo legal de las pruebas: la web no se actualiza',
          texto: ['Radar Balcarce: falló una prueba del núcleo legal.', 'La web NO se actualizó en esta vuelta (queda como estaba) y no va a actualizarse hasta que se arregle.',
            `Vuelta: ${cfg.id} (Cloudflare → Workers & Pages → radar-balcarce-motor → Builds)`].join('\n'),
          clave: 'nucleo-legal-fallo', nivel: 'alta',
        }, { env }).catch(() => ({ ok: false }));
        log(r.ok ? `Aviso enviado por ${r.via}.` : 'El aviso no salió.');
      }
      throw e;
    }

    // 4. La memoria del cruce de medios y lo que el celular lee de las notas enteras (antes: actions/cache).
    let memoria = new Map();
    if (deposito) {
      const t0 = ahora().getTime();
      memoria = await restaurarCache(deposito, raiz);
      pasos['Traer la memoria del cruce (R2)'] = { ok: true, segundos: Math.round((ahora().getTime() - t0) / 1000), archivos: memoria.size };
      log(`Memoria restaurada: ${memoria.size} archivo(s).`);
    }

    // 5. Buscar noticias y armar los datos. La foto de los archivos de antes es lo que después permite saber qué cambió.
    const antes = fotografiar(raiz);
    // FOTOS_EN_R2: lo que muestran las notas de ahora se trae de R2 antes de armar (la compilación lee las fotos del disco) y se anota qué fotos
    // tiene R2 (generar-datos no da por perdida una foto que está en R2 y no en disco). Si algo falla, sigue sin eso: nunca frena la vuelta.
    const hidratadas = new Set();
    let indiceR2 = new Set();
    if (cfg.fotosEnR2 && !cfg.simular && !depositoFotos) log('(FOTOS_EN_R2 está prendida pero faltan R2_ARCHIVO o las claves de R2: las fotos siguen yendo a git)');
    if (depositoFotos) {
      const tFotos = ahora().getTime();
      try {
        indiceR2 = await indiceDeFotos(depositoFotos);
        guardarIndice(raiz, indiceR2);
        entorno.FOTOS_R2_INDICE = rutaDelIndice(raiz);
        const leerLista = (ruta) => { try { return JSON.parse(fs.readFileSync(path.join(raiz, ruta), 'utf8')); } catch { return []; } };
        const archivoNotas = leerLista('web/data/archivo.json');
        // Las ilustraciones más nuevas del libro van primero (regla 316): el Worker de tareas las sube a R2 y NO a git, y en esta misma vuelta una nota va a
        // empezar a mostrarlas; sin traerlas, la tarjeta y la medida de esa nota saldrían sin foto hasta la vuelta siguiente.
        let libroIA = {};
        try { libroIA = JSON.parse(fs.readFileSync(path.join(raiz, 'web/data/fotos-ia.json'), 'utf8')) ?? {}; } catch { /* sin libro */ }
        const ilustracionesNuevas = Object.values(libroIA).filter((e) => e?.archivo).sort((a, b) => String(b.cuando ?? '').localeCompare(String(a.cuando ?? ''))).slice(0, 40)
          .map((e) => ({ foto: { archivo: e.archivo } }));
        const nombres = fotosQueNecesitan(ilustracionesNuevas, leerLista('web/data/portada.json')?.notas ?? [], Array.isArray(archivoNotas) ? archivoNotas : []).filter((n) => indiceR2.has(n)).slice(0, 800);
        const h = await hidratar({ raiz, nombres, leer: lectorDeR2(depositoFotos), limiteSegundos: 150, ahora: () => ahora().getTime(), log });
        for (const n of h.bajadas) hidratadas.add(n);
        pasos['Traer las fotos de R2'] = { ok: true, segundos: Math.round((ahora().getTime() - tFotos) / 1000), bajadas: h.bajadas.size, faltan: h.faltan.length, fallaron: h.fallaron.length };
        log(`Fotos de R2: ${indiceR2.size} en el depósito, ${h.bajadas.size} traídas para compilar${h.faltan.length + h.fallaron.length ? ` (${h.faltan.length} que R2 no tiene, ${h.fallaron.length} que fallaron)` : ''}.`);
      } catch (e) { log(`(no se pudo leer el depósito de fotos: ${e.message}; la vuelta sigue como si no hubiera R2)`); }
    }
    // El commit con el que empezó esta vuelta: lo que entre después es lo que "entró mientras se armaba" (paso 8).
    const cabezaAlInicio = env.WORKERS_CI_COMMIT_SHA || (gh && !cfg.simular ? await gh.cabeza().catch(() => null) : null);
    await correr('Buscar noticias y armar los datos', 'node', ['scripts/generar-datos.mjs'], { cwd: web, capturar: true });
    if (deposito && !cfg.simular) {
      const t0 = ahora().getTime();
      const subidos = await guardarCache(deposito, raiz, memoria);
      pasos['Guardar la memoria del cruce (R2)'] = { ok: true, segundos: Math.round((ahora().getTime() - t0) / 1000), archivos: subidos };
      log(`Memoria guardada: ${subidos} archivo(s) nuevo(s) o cambiados.`);
    }

    // 6. Compilar el sitio UNA vez y revisar el SEO.
    const compilar = async (cual) => {
      await correr(cual, 'npm', ['run', 'build'], { cwd: web, extra: { SITIO: cfg.sitio } });
      await correr(`${cual === 'Compilar el sitio' ? 'Revisar que el SEO siga en pie' : 'Revisar el SEO (otra vez)'}`, 'node', ['scripts/revisar-seo.mjs'], { cwd: web });
    };
    // Regla 304: si lo que lee la compilación es idéntico a lo publicado, no se compila ni se sube (la huella está en el propio sitio).
    compilo = true;
    if (huellaPublicada && !cfg.simular) {
      try {
        const decision = decidirSiCompilar({
          ahora: huellaDelSitio({ raiz, env: entorno, ahora: ahora() }), publicada: await huellaPublicada(cfg.sitio), forzar: si(env.COMPILAR_SIEMPRE),
        });
        log(decision.compilar ? `Se compila: ${decision.porque}.` : `NO se compila ni se sube: ${decision.porque}.`);
        compilo = decision.compilar;
      } catch (e) { log(`(no se pudo calcular la huella del sitio: ${e.message}; se compila)`); }
    }
    if (compilo) await compilar('Compilar el sitio');
    else pasos['Compilar el sitio'] = { ok: true, segundos: 0, omitido: true };

    // 7. Guardar los datos en main por la API. Si no se puede guardar, no se sube nada (como en el workflow).
    let padre = null;
    let cambios = cambiosDesde(raiz, antes);
    if (depositoFotos) {
      // Las fotos nuevas van a R2 y salen del commit; la que no se pudo subir va en el commit como siempre. Se sube ANTES de guardar
      // banco-fotos.json: el banco nunca apunta a una foto que no esté en R2 ni en git.
      try {
        const { git, subir } = separarCambios(cambios, { hidratadas });
        const { subidas, fallidas } = await subirFotos(depositoFotos, subir);
        const fallo = new Set(fallidas.map((x) => x.nombre));
        cambios = [...git, ...subir.filter((s) => fallo.has(s.nombre)).map((s) => s.cambio)].sort((a, b) => (a.ruta < b.ruta ? -1 : 1));
        log(`Fotos nuevas: ${subidas.length} a R2${fallidas.length ? `, ${fallidas.length} no se pudieron subir y van en el commit (${fallidas[0].error})` : ''}.`);
        pasos['Fotos nuevas a R2'] = { ok: fallidas.length === 0, segundos: 0, subidas: subidas.length, fallidas: fallidas.length };
        for (const n of subidas) indiceR2.add(n);
        // Lo retirado (menores, víctimas) se borra también de R2: es lo único que se borra de ahí.
        const leerObjeto = (ruta) => { try { return JSON.parse(fs.readFileSync(path.join(raiz, ruta), 'utf8')); } catch { return {}; } };
        const retiradas = idsRetiradosDe({ banco: leerObjeto('web/data/banco-fotos.json'), retiradas: leerObjeto('web/data/retiradas.json'), revision: leerObjeto('web/data/revision-archivo.json') });
        const aBorrar = fotosRetiradasParaBorrar(indiceR2, retiradas);
        for (const n of aBorrar) await depositoFotos.borrar(claveDeFoto(n));
        if (aBorrar.length) log(`Fotos de notas retiradas borradas de R2: ${aBorrar.length}.`);
      } catch (e) { log(`(las fotos no se pudieron mandar a R2: ${e.message}; van en el commit)`); cambios = cambiosDesde(raiz, antes).filter((c) => !(c.baseSha === null && hidratadas.has(c.ruta.split("/").pop()))); }
    }
    log(`\n▶ Guardar si cambió algo: ${cambios.length} archivo(s) distintos.`);
    if (cfg.simular) log('  (simulacro: no se guarda)');
    else if (cambios.length) {
      const tCommit = ahora().getTime();
      const r = await gh.commitear({ mensaje: `Datos de la portada · ${fechaCorta(ahora())}`, cambios });
      pasos['Guardar los datos en GitHub'] = { ok: true, segundos: Math.round((ahora().getTime() - tCommit) / 1000), archivos: cambios.length };
      padre = r.padre ?? null;
      log(`  guardado${r.sha ? ` (${r.sha.slice(0, 7)})` : ''} en ${r.intentos} intento(s).`);
    } else log('  Sin novedades en los datos: se sube igual lo compilado.');

    // 8. ¿Entró algo mientras se armaba que el sitio lee? Entonces se recompila con eso antes de subir (regla 189).
    if (!cfg.simular && gh) {
      try {
        const hasta = padre ?? await gh.cabeza();
        if (cabezaAlInicio && cabezaAlInicio !== hasta) {
          const { archivos, completo } = await gh.archivosEntre(cabezaAlInicio, hasta);
          const propios = new Set(cambios.map((c) => c.ruta));
          const ajenos = archivos.filter((a) => !propios.has(a.ruta));
          const decision = completo ? hayQueRecompilar(ajenos.map((a) => a.ruta)) : { recompilar: true, porque: ['(demasiados archivos para comparar)'] };
          if (decision.recompilar) {
            log(`Entraron cambios que el sitio sí lee (${decision.porque.slice(0, 8).join(', ')}): se traen y se vuelve a compilar antes de subir.`);
            let lock = false;
            for (const a of ajenos.filter((x) => decision.porque.includes(x.ruta))) {
              if (/(^|\/)package(-lock)?\.json$/.test(a.ruta)) lock = true;
              if (a.estado === 'removed') { fs.rmSync(path.join(raiz, a.ruta), { force: true }); continue; }
              const bytes = await gh.leerArchivo(a.ruta, hasta);
              if (bytes) { fs.mkdirSync(path.dirname(path.join(raiz, a.ruta)), { recursive: true }); fs.writeFileSync(path.join(raiz, a.ruta), bytes); }
            }
            if (lock) { await correr('Instalar de nuevo', 'npm', ['ci', '--no-audit', '--no-fund'], { cwd: raiz }); await correr('Instalar de nuevo (web)', 'npm', ['ci', '--no-audit', '--no-fund'], { cwd: web }); }
            await compilar('Volver a compilar con lo que entró');
            compilo = true;
          } else log('Mientras se armaba sólo entró lo que el sitio no lee: se sube lo ya compilado.');
        }
      } catch (e) { log(`(no se pudo comparar con lo que entró en el medio: ${e.message}; se sube lo compilado)`); }
    }

    // 8b. La memoria de tarjetas en R2 (regla 312, apagada por defecto): lo que esta compilación dibujó de nuevo se guarda, lo que pidió se anota y lo que
    // nadie pidió en 3 días se borra. Antes de subir el sitio y con tope de tiempo: nunca atrasa ni frena la publicación.
    if (cfg.tarjetasEnR2 && deposito && !cfg.simular && compilo) {
      const t0 = ahora().getTime();
      try {
        const r = await sincronizarTarjetas(deposito, path.join(raiz, '.cache', 'tarjetas'), { ahora: ahora(), desde: inicio, log, reloj: () => ahora().getTime() });
        pasos['Guardar las tarjetas nuevas en R2'] = { ok: r.fallidas === 0, segundos: Math.round((ahora().getTime() - t0) / 1000), ...r };
        log(`Tarjetas: ${r.pedidas} pedidas en esta compilación, ${r.subidas} nuevas a R2${r.fallidas ? ` (${r.fallidas} no se pudieron subir)` : ''}${r.pendientes ? `, ${r.pendientes} quedan para la vuelta siguiente` : ''}, ${r.borradas} borradas por viejas; en R2 quedan ${r.enR2}.`);
      } catch (e) {
        pasos['Guardar las tarjetas nuevas en R2'] = { ok: false, segundos: Math.round((ahora().getTime() - t0) / 1000) };
        log(`(no se pudo dejar la memoria de tarjetas en R2: ${e.message}; el sitio se sube igual)`);
      }
    }

    // 9. El archivo permanente (R2): no frena la subida.
    if (cfg.archivoR2 && !cfg.simular && compilo) {
      await correr('Archivar las notas por salir (R2)', 'node', ['web/scripts/archivar-a-r2.mjs', '--subir', '--borrar', '--produccion', `--bucket=${cfg.archivoR2}`, '--margen=auto', '--limite-segundos=360'], { puedeFallar: true });
      if (pasos['Archivar las notas por salir (R2)']?.ok === false) {
        await avisar({
          asunto: 'Falló el archivo permanente (R2): el sitio se publicó igual',
          texto: 'Radar Balcarce: falló el paso del archivo permanente (guardar en R2 las notas que están por salir del sitio). El sitio SÍ se publicó igual. Si sigue fallando se pueden perder páginas viejas, y lo retirado (menores, víctimas) podría no haberse borrado del archivo: mirar la vuelta en Workers Builds.',
          clave: 'archivo-r2-fallo', nivel: 'alta',
        }, { env }).catch(() => null);
      }
    }

    // 10. Subir a Cloudflare Pages (Direct Upload: no cuenta contra los builds de Pages) y avisarle a Bing.
    if (cfg.simular) log('\n▶ Subir a Cloudflare Pages: (simulacro: no se sube)');
    else if (!compilo) log('\n▶ Subir a Cloudflare Pages: (nada cambió desde lo publicado: no se sube)');
    else {
      if (huellaPublicada) { try { escribirLaHuella(raiz, huellaDelSitio({ raiz, env: entorno, ahora: ahora() })); } catch (e) { log(`(no se pudo anotar la huella del sitio: ${e.message})`); } }
      await correr('Subir a Cloudflare Pages', 'npx', ['--yes', `wrangler@${VERSION_DE_WRANGLER}`, 'pages', 'deploy', 'out', `--project-name=${cfg.proyecto}`, '--branch=main'], { cwd: web });
      await correr('Avisar a Bing de las notas nuevas', 'node', ['redes/indexnow.mjs'], { puedeFallar: true });
    }

    resultado = { ok: true, pasos, segundos: Math.round((ahora().getTime() - inicio) / 1000), commit: padre };
    return resultado;
  } catch (e) {
    log(`\n✖ La vuelta no terminó: ${e.message}`);
    resultado = { ok: false, motivo: e.message, pasos, segundos: Math.round((ahora().getTime() - inicio) / 1000) };
    return resultado;
  } finally {
    if (deposito && !cfg.simular && tenemosElCandado) {
      const segundos = (ahora().getTime() - inicio) / 1000;
      try { await anotarVuelta(deposito, { id: cfg.id, ok: resultado.ok, motivo: resultado.motivo ?? null, segundos, pasos, ahora: ahora(), anotaciones, compilo, extraMinutos: cfg.minutosDeMas, cicloDia: cfg.cicloDia }); } catch (e) { log(`(no se pudo anotar la vuelta en R2: ${e.message})`); }
      await soltarCandado(deposito, { id: cfg.id });
    }
    log(`\nVuelta ${resultado.omitida ? 'saltada' : resultado.ok ? 'terminada' : 'fallida'} en ${resultado.segundos ?? Math.round((ahora().getTime() - inicio) / 1000)} s.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--simular')) process.env.MOTOR_SIMULAR = 'Si';
  const r = await vuelta({ huellaPublicada: (sitio) => leerHuellaPublicada(sitio) });
  process.exit(r.ok ? 0 : 1);
}
