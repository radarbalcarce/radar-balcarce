// El programa que arma las piezas de video del día (Radar 3.0, etapa D). Corre en GitHub Actions (workflow «Radar 3.0: piezas de redes», v3-piezas.yml), porque dibujar (resvg) y
// juntar (ffmpeg) no entra en un Worker. NO decide qué toca: se lo pide al Worker `radar-redes` (POST /piezas/plan, que lo saca de la tabla de horarios y de la base del núcleo y
// lo reserva), y después le cuenta cómo salió (POST /piezas/resultado). Para cada pieza del plan:
//   1. junta los datos que no están en la base (clima, farmacia, efeméride) y la arma (armadores.mjs);
//   2. pide la voz a Gemini (la de hoy, CRITERIO-REDES.md § 6; cupo 10 audios por día; si no hay cupo, la pieza NO sale, nunca con otra voz);
//   3. dibuja el video con la voz y los subtítulos de la voz (render.mjs);
//   4. ENSAYO (REDES_ACTIVAS «no» en el Worker): sin GEMINI_API_KEY_REDES_V3 el video sale MUDO (subtítulos estimados, el .json dice «sin voz: ensayo»); guarda el mp4 y el registro de lo que HABRÍA publicado y cuándo, y NO llama a Meta. REAL («si»): publica reel e historia en las dos redes.
// Ninguna clave va en el código: GEMINI_API_KEY_REDES (o GEMINI_API_KEY_REDES_V3), META_TOKEN y TELEGRAM_TOKEN llegan por el entorno desde GitHub Secrets.
//
//   node v3/redes/piezas/correr.mjs                 lo que toca ahora
//   SOLO=clima-manana,noticia1 node …/correr.mjs    ensayar esas piezas a mano (sólo con las redes apagadas; no mira el horario pero sí el cupo de voz)
//   AHORA=2026-11-03T13:00:00Z node …/correr.mjs    ensayar a otra hora (sólo con las redes apagadas)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import {
  armarClima, armarRepaso, armarEfemeride, armarFarmacia, armarParticipa, armarAgenda, armarUtiles, armarFeriado, armarAviso, armarCarrusel, armarCarruselSemana, armarCarruselFinde,
} from './armadores.mjs';
import {
  avisoDelClima, datosDelFeriado, efemerideDelDia, eventosParaLaAgenda, fechaLarga, feriadoDelDia, leerClima, leerFarmaciaDeTurno,
} from './datos.mjs';
import { condicionalesQueTocan } from '../piezas-del-dia.mjs';
import {
  accionesConTexto, accionesDeCarrusel, nombreDeLamina, publicarCarrusel, publicarPieza, publicarPorBuffer, simularBuffer, simularPublicacion, textoDePieza,
} from './publicar.mjs';
import { claveR2DePlaca } from '../placa-clave.mjs';
import { contrasenaDelWebhook } from '../redes.mjs';
import { diaDeBalcarce } from '../elegir.mjs';
import { contarPalabras } from './voz.mjs';
import { CIERRE_DESPUES_DE_LA_VOZ, FINDE } from './variables.mjs';

const RAIZ = path.join(import.meta.dirname, '..', '..', '..');
export const DIRECCION_DE_LAS_REDES = 'https://radar-redes.radarbalcarce.workers.dev';

/** Falta un dato de afuera (el clima no responde, no hay farmacia ni efeméride preparada): la pieza no sale ahora y se vuelve a intentar. */
export class SinDatos extends Error {}
/** No hay cupo de voz (Google dice que se acabó el del día): la pieza no sale, nunca con otra voz. El cupo propio de 10 lo cuida el Worker al hacer el plan: cada pieza que llega ya tiene su audio reservado. */
export class SinCupo extends Error {}

const hash = (t) => crypto.createHash('sha256').update(t).digest('hex').slice(0, 24);

/** La pieza armada (datos puros) de una entrada del plan. Tira `SinDatos` si falta algo de afuera. */
export function armarDelPlan(item, {
  dia, ahora = new Date(), clima = null, farmacia = null, efemeride = null, agenda = null, feriado = null, aviso = null, finde = null,
}) {
  const op = { hora: item.horaDelDia, primeraDelBloque: item.primeraDelBloque };
  switch (item.arma) {
    case 'clima':
      if (!clima) throw new SinDatos('no hay clima (Open-Meteo no respondió)');
      return armarClima(clima, { auspicio: item.datos?.auspicio ?? null, fecha: dia, momento: item.id === 'clima-noche' ? 'noche' : 'manana', ...op });
    case 'farmacia':
      if (!farmacia) throw new SinDatos('no hay farmacia de turno para hoy');
      return armarFarmacia(farmacia.farmacias, { fecha: farmacia.fecha, ...op });
    case 'efemeride':
      if (!efemeride) throw new SinDatos(`no hay efeméride preparada para ${dia}`);
      return armarEfemeride(efemeride, { fecha: dia, anioActual: Number(dia.slice(0, 4)), ...op });
    case 'participa':
      return armarParticipa(item.variante, op);
    case 'agenda':
      if (!agenda?.length) throw new SinDatos('no hay eventos en la agenda de los próximos días');
      return armarAgenda(agenda, op);
    case 'utiles':
      return armarUtiles(op);
    case 'feriado':
      if (!feriado) throw new SinDatos(`hoy (${dia}) no hay un feriado con datos verificados`);
      return armarFeriado({ ...feriado, fecha: dia }, { datos: datosDelFeriado(feriado, 220), ...op });
    case 'aviso':
      if (!clima) throw new SinDatos('no hay clima (Open-Meteo no respondió)');
      if (!aviso || aviso.nombre !== item.id) throw new SinDatos(`ya no hay un ${item.id} para dar`);
      return armarAviso(aviso, clima, { fecha: dia, ...op });
    case 'carrusel-semana':
      if (!item.datos?.notas?.length) throw new SinDatos('no hay notas de Balcarce para el resumen de la semana');
      return armarCarruselSemana(item.datos.notas, { desde: item.datos.desde, hasta: item.datos.hasta });
    case 'carrusel-finde':
      if (!finde?.length) throw new SinDatos('no hay eventos en la agenda de los próximos días');
      return armarCarruselFinde(finde, { fechaTexto: `Desde el ${fechaLarga(ahora).toLowerCase()}` });
    case 'carrusel-nota':
      if (!item.datos?.nota) throw new SinDatos('falta la nota del carrusel');
      return armarCarrusel(item.datos.nota);
    case 'repaso':
      return armarRepaso(item.datos?.notas ?? [], { fecha: fechaLarga(ahora), momento: item.momento, sinBalcarce: item.datos?.sinBalcarce === true, ...op });
    default:
      throw new Error(`no conozco el armador «${item.arma}»`);
  }
}

/**
 * La misma pieza con la duración que sale de la VOZ de verdad (Hernán, 3/11: «el audio termina antes que la animación»): el video dura la voz + `CIERRE_DESPUES_DE_LA_VOZ` (1,5 s),
 * nunca menos que la voz y nunca más de 2 s de silencio al final. La voz se reparte entre las escenas según las palabras que dice cada una (las que no dicen nada cuentan como una
 * palabra): si la voz es más corta que lo previsto, las escenas se acortan; si es más larga, se estiran. El cierre se suma a la última. Vale para todas las piezas con voz.
 */
export function ajustarALaVoz(pieza, segundosDeVoz) {
  if (!(segundosDeVoz > 0) || !pieza.escenas?.length) return pieza;
  const pesos = pieza.escenas.map((e) => Math.max(1, contarPalabras(e.voz ?? '')));
  const suma = pesos.reduce((a, b) => a + b, 0);
  const total = Number((segundosDeVoz + CIERRE_DESPUES_DE_LA_VOZ).toFixed(2));
  let usado = 0;
  const escenas = pieza.escenas.map((e, i) => {
    const ultima = i === pieza.escenas.length - 1;
    const duracion = ultima ? Number((total - usado).toFixed(2)) : Number(((segundosDeVoz * pesos[i]) / suma).toFixed(2));
    usado += duracion;
    return { ...e, duracion };
  });
  return { ...pieza, escenas, duracion: total };
}

/** El resumen de lo que hay que mirar para saber si dos corridas armaron lo mismo (el guion, las escenas sin las fotos bajadas). */
export const huellaDeLaPieza = (pieza) => hash(JSON.stringify([pieza.id, pieza.guion, pieza.escenas.map((e) => [e.tipo, e.duracion, e.datos?.titulo ?? null])]));

/**
 * Un carrusel (varias imágenes 4:5, sin voz): dibuja las láminas, arma el texto y, ENSAYO, las deja en la carpeta y anota lo que se habría publicado; REAL, sube cada lámina como JPEG al
 * depósito público de placas y publica el álbum en Facebook y el carrusel en Instagram. Si una lámina no se puede subir no se publica nada (un carrusel a medias no sirve).
 * Completa `informe` (estado, texto, archivos, acciones); un error se tira y lo anota quien llama.
 */
async function hacerCarrusel({ pieza, item, plan, carpeta, env, deps, informe, reloj }) {
  const r = await deps.renderizarCarrusel(pieza, carpeta, item.id);
  if (r.fotosQueNoBajaron?.length) informe.aviso = `${informe.aviso ? `${informe.aviso}; ` : ''}fotos que no bajaron (van con la placa): ${r.fotosQueNoBajaron.join(' | ')}`;
  const acciones = accionesDeCarrusel(pieza, item);
  informe.texto = acciones[0].pie;
  informe.laminas = r.archivos.length;
  informe.archivos = [...r.archivos.map((a) => path.basename(a)), `${item.id}.json`];
  if (plan.activas) {
    const clave = item.arma === 'carrusel-semana' ? 'sem' : item.arma === 'carrusel-finde' ? 'fin' : `n${item.datos?.nota?.id ?? 'x'}`;
    const urls = [];
    for (const [i, png] of r.archivos.entries()) urls.push(await deps.subirLamina(png, { prefijo: `lam-${String(plan.dia).replace(/-/g, '')}-${clave}-${i + 1}` }));
    informe.acciones = await publicarCarrusel({ cliente: deps.clienteMeta(), urls, acciones, sinToken: (t) => String(t).split(env.META_TOKEN || '\u0000').join('[token]') });
    const buenas = informe.acciones.filter((a) => a.estado === 'ok').length;
    informe.estado = buenas ? 'publicada' : 'error';
    if (!buenas) informe.error = `Meta rechazó todo: ${informe.acciones.map((a) => `${a.red}/${a.tipo}: ${a.error}`).join(' | ').slice(0, 400)}`;
  } else {
    informe.acciones = acciones.map((a) => ({ red: a.red, tipo: a.tipo, estado: 'simulada' }));
    informe.estado = 'lista';
  }
  fs.writeFileSync(path.join(carpeta, `${item.id}.json`), JSON.stringify({ ...informe, habriaPublicadoA: reloj.toISOString(), programada: item.hora, pieza: item.id, laminas: r.archivos.length }, null, 2));
}

async function pedirAlWorker(url, ruta, cuerpo, { contrasena, fetchFn }) {
  const r = await fetchFn(`${url}${ruta}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-radar-contrasena': contrasena }, body: JSON.stringify(cuerpo) });
  if (!r.ok) throw new Error(`${ruta}: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

/**
 * Una corrida completa. Todo lo de afuera entra por `deps` (en las pruebas son de mentira; `dependenciasReales` arma las de verdad).
 * @param {object} o  { env, ahora, carpeta, deps: { fetchFn, leerClima, leerFarmacia, leerEfemerides, decir, renderizar, subtitulos, clienteMeta, log } }
 */
export async function correr({ env = {}, ahora = new Date(), carpeta, deps }) {
  const log = deps.log ?? console.log;
  const url = (env.REDES_URL || DIRECCION_DE_LAS_REDES).replace(/\/$/, '');
  if (!env.TELEGRAM_TOKEN) throw new Error('falta TELEGRAM_TOKEN (la contraseña entre el programa y el Worker de redes se deriva de ahí)');
  const contrasena = await contrasenaDelWebhook(env.TELEGRAM_TOKEN);
  const llamar = (ruta, cuerpo) => pedirAlWorker(url, ruta, cuerpo, { contrasena, fetchFn: deps.fetchFn });

  const solo = String(env.SOLO ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  // Las piezas condicionales (feriado, agenda, avisos de clima) sólo se piden si hay algo para contar: se mira ANTES de pedir el plan, para no reservarles lugar en el cupo de voz de balde.
  const cuando = env.AHORA ? new Date(env.AHORA) : ahora;
  const diaDeHoy = diaDeBalcarce(cuando);
  const queMirar = condicionalesQueTocan(cuando, solo);
  const previos = { clima: null, agenda: null, feriado: null, aviso: null, finde: null };
  const conDatos = [];
  if (queMirar.some((p) => p.arma === 'aviso')) {
    previos.clima = await deps.leerClima();
    previos.aviso = previos.clima ? avisoDelClima(previos.clima, cuando) : null;
    if (previos.aviso && queMirar.some((p) => p.id === previos.aviso.nombre)) conDatos.push(previos.aviso.nombre);
  }
  if (queMirar.some((p) => p.id === 'agenda' || p.id === 'carrusel-finde') && deps.leerAgenda) {
    const eventos = await deps.leerAgenda();
    if (queMirar.some((p) => p.id === 'agenda')) {
      previos.agenda = eventosParaLaAgenda(eventos, { ahora: cuando });
      if (previos.agenda.length) conDatos.push('agenda');
    }
    if (queMirar.some((p) => p.id === 'carrusel-finde')) {
      previos.finde = eventosParaLaAgenda(eventos, { ahora: cuando, maximo: FINDE.eventosMax });
      if (previos.finde.length) conDatos.push('carrusel-finde');
    }
  }
  if (queMirar.some((p) => p.id === 'feriado') && deps.leerFeriados) {
    const { feriados, elegidas } = await deps.leerFeriados();
    previos.feriado = feriadoDelDia(feriados, diaDeHoy, elegidas);
    if (previos.feriado) conDatos.push('feriado');
  }
  const plan = await llamar('/piezas/plan', { ...(env.AHORA ? { ahora: env.AHORA } : {}), ...(solo.length ? { solo } : {}), conDatos });
  const reloj = env.AHORA && !plan.activas ? new Date(env.AHORA) : ahora;
  log(`plan ${plan.dia}: ${plan.piezas.length} piezas, voz ${plan.vozQuedan}/${plan.vozTope}, ${plan.activas ? 'REAL' : 'ENSAYO (no se publica)'}${plan.descartes.length ? `; descartadas: ${plan.descartes.map((d) => `${d.pieza} (${d.motivo})`).join(', ')}` : ''}`);
  const salida = { dia: plan.dia, activas: plan.activas, piezas: [], descartes: plan.descartes };
  if (!plan.piezas.length) return salida;

  fs.mkdirSync(carpeta, { recursive: true });
  // Los datos de afuera se piden una sola vez por corrida, y sólo si alguna pieza los necesita.
  const necesita = (arma) => plan.piezas.some((p) => p.arma === arma);
  const datos = {
    clima: previos.clima ?? (necesita('clima') || necesita('aviso') ? await deps.leerClima() : null),
    agenda: previos.agenda ?? (necesita('agenda') && deps.leerAgenda ? eventosParaLaAgenda(await deps.leerAgenda(), { ahora: reloj }) : null),
    feriado: previos.feriado ?? (necesita('feriado') && deps.leerFeriados ? (({ feriados, elegidas }) => feriadoDelDia(feriados, plan.dia, elegidas))(await deps.leerFeriados()) : null),
    aviso: previos.aviso ?? null,
    finde: previos.finde ?? (necesita('carrusel-finde') && deps.leerAgenda ? eventosParaLaAgenda(await deps.leerAgenda(), { ahora: reloj, maximo: FINDE.eventosMax }) : null),
    farmacia: necesita('farmacia') ? await deps.leerFarmacia() : null,
    efemeride: necesita('efemeride') ? efemerideDelDia(await deps.leerEfemerides(), plan.dia) : null,
  };

  for (const item of plan.piezas) {
    const informe = { pieza: item.id, fila: item.fila, estado: 'error', vozUsada: false };
    try {
      let pieza = armarDelPlan(item, { dia: plan.dia, ahora: reloj, ...datos });
      const huella = huellaDeLaPieza(pieza);
      Object.assign(informe, { huella, guion: pieza.guion });
      if (pieza.tipo === 'carrusel') {
        // Sin voz, sin video y sin Buffer: sólo imágenes para Facebook (álbum) e Instagram (carrusel).
        await hacerCarrusel({ pieza, item, plan, carpeta, env, deps, informe, reloj });
        log(`${item.id}: ${informe.estado} · ${informe.laminas} láminas`);
        salida.piezas.push(informe);
        try { await llamar('/piezas/resultado', informe); } catch (e) { log(`${item.id}: no pude contarle al Worker cómo salió (${e.message})`); informe.sinAnotar = true; }
        continue;
      }
      if (item.datos?.sinBalcarce) informe.aviso = 'sin notas de Balcarce en la ventana: el repaso salió con las más contadas';
      const sinFoto = (item.datos?.notas ?? []).filter((n) => !n.foto).length;
      if (sinFoto) informe.aviso = `${informe.aviso ? `${informe.aviso}; ` : ''}${sinFoto} nota(s) sin foto van con la placa de su sección`;

      const base = path.join(carpeta, item.id);
      // ENSAYO sin clave de voz propia (GEMINI_API_KEY_REDES_V3): el video sale MUDO, con subtítulos estimados, para no gastar el cupo de la clave del sistema viejo.
      const mudo = !plan.activas && !env.GEMINI_API_KEY_REDES_V3;
      let voz = null;
      if (mudo) informe.sinVoz = 'sin voz: ensayo';
      else {
        voz = await deps.decir(pieza.guion, `${base}.mp3`, { voz: pieza.voz, pieza: item.id, bloque: item.bloque, activas: plan.activas });
        informe.vozUsada = !voz.deLaMemoria;
        pieza = ajustarALaVoz(pieza, voz.duracion);
      }
      informe.duracion = pieza.duracion;

      const subtitulos = mudo ? deps.subtitulosEstimados(pieza) : deps.subtitulos(voz.palabras);
      const r = await deps.renderizar(pieza, `${base}.mp4`, { voz: voz?.archivo ?? null, subtitulos });
      if (r.fotosQueNoBajaron?.length) informe.aviso = `${informe.aviso ? `${informe.aviso}; ` : ''}fotos que no bajaron (van con la placa): ${r.fotosQueNoBajaron.join(' | ')}`;
      const acciones = accionesConTexto(pieza, item);
      informe.texto = acciones[0]?.pie || textoDePieza(pieza, item, 'facebook');
      informe.archivos = mudo ? [`${item.id}.mp4`, `${item.id}.json`] : [`${item.id}.mp4`, `${item.id}.mp3`, `${item.id}.json`];

      if (plan.activas) {
        const cliente = deps.clienteMeta();
        const mp4 = fs.readFileSync(r.mp4);
        // La tapa de la grilla de reels: un cuadro quieto de la primera escena (en el repaso, la lista pareja), nunca uno a medio animar (Hernán, 3/11).
        const tapaMs = Math.round(Math.min(3, (pieza.escenas?.[0]?.duracion ?? 2) * 0.7) * 1000);
        const tapa = deps.cuadro ? await deps.cuadro(r.mp4, tapaMs).catch(() => null) : null;
        informe.acciones = await publicarPieza({ cliente, mp4, acciones, tapaMs, tapa, sinToken: (t) => String(t).split(env.META_TOKEN || '\u0000').join('[token]') });
        const buenas = informe.acciones.filter((a) => a.estado === 'ok').length; // sólo Meta decide si la pieza salió; Buffer se suma aparte
        if (item.buffer?.length) {
          if (deps.subirVideo && deps.publicarEnBuffer && env.BUFFER_API_KEY) {
            const huella = `${plan.dia}-${item.id}-${item.fila}`;
            informe.acciones.push(...await publicarPorBuffer({ pieza, item, mp4, huella, duracion: pieza.duracion, subirVideo: deps.subirVideo, publicarEnBuffer: deps.publicarEnBuffer, sinSecreto: (t) => String(t).split(env.BUFFER_API_KEY).join('[clave]') }));
          } else informe.aviso = `${informe.aviso ? `${informe.aviso}; ` : ''}sin BUFFER_API_KEY: no sale en TikTok, YouTube ni X`;
        }
        informe.estado = buenas ? 'publicada' : 'error';
        if (!buenas) informe.error = `Meta rechazó todo: ${informe.acciones.map((a) => `${a.red}/${a.tipo}: ${a.error}`).join(' | ').slice(0, 400)}`;
      } else {
        informe.acciones = [...simularPublicacion(acciones), ...simularBuffer(item)];
        informe.estado = 'lista';
      }
      fs.writeFileSync(`${base}.json`, JSON.stringify({ ...informe, habriaPublicadoA: reloj.toISOString(), programada: item.hora, pieza: item.id, guionAlineado: voz?.palabras?.length ?? 0 }, null, 2));
      log(`${item.id}: ${informe.estado} · ${pieza.duracion} s · voz ${informe.vozUsada ? 'nueva' : 'de la memoria'}`);
    } catch (e) {
      informe.estado = e instanceof SinDatos ? 'sin-datos' : (e instanceof SinCupo || e?.sinCupo) ? 'sin-cupo' : 'error';
      informe.error = String(e?.message ?? e).slice(0, 500);
      log(`${item.id}: ${informe.estado} · ${informe.error}`);
    }
    salida.piezas.push(informe);
    try { await llamar('/piezas/resultado', informe); } catch (e) { log(`${item.id}: no pude contarle al Worker cómo salió (${e.message})`); informe.sinAnotar = true; }
  }
  fs.writeFileSync(path.join(carpeta, 'registro.json'), JSON.stringify(salida, null, 2));
  return salida;
}

/** Las dependencias de verdad (dibujo, voz, Meta, Open-Meteo, el sitio de farmacias). Se cargan acá y no arriba para que las pruebas no necesiten resvg, ffmpeg ni claves. */
export async function dependenciasReales(env = process.env) {
  const { decirGemini } = await import('../../../reels/voz-gemini.mjs');
  const { VOCES, INDICACIONES, componerIndicacion } = await import('../../../redes/prompt-redes.mjs');
  const { paraLeer, enCarteles } = await import('../../../reels/voz.mjs');
  const { armarAss } = await import('../../../reels/reel.mjs');
  const { SinCupoDeVoz } = await import('../../../reels/cupo-voz.mjs');
  const { crearCliente, PAGINA_DE_FACEBOOK } = await import('../../../redes/meta.mjs');
  const { resolverFotos, armarEscenaDeVideo, armarVideo, subtitulosEstimados, renderizarPieza } = await import('./render.mjs');
  const { leerFarmacia } = await import('../../sitio/datos-del-dia.mjs');
  const { leerAgenda } = await import('../../sitio/agenda.mjs');
  const { publicarReel } = await import('../../../redes/buffer.mjs');
  const { clienteR2 } = await import('../../../infra/compartido/r2-s3.mjs');
  return {
    fetchFn: fetch,
    leerClima: () => leerClima({}),
    leerFarmacia: () => leerFarmaciaDeTurno({ leerDelSitio: leerFarmacia }),
    leerAgenda: async () => (await leerAgenda({ traer: fetch })).eventos,
    leerFeriados: async () => ({
      feriados: JSON.parse(fs.readFileSync(path.join(RAIZ, 'web', 'data', 'feriados-piezas.json'), 'utf8')),
      elegidas: (() => { try { return JSON.parse(fs.readFileSync(path.join(RAIZ, 'web', 'data', 'efemerides-elegidas.json'), 'utf8')); } catch { return null; } })(),
    }),
    leerEfemerides: async () => JSON.parse(fs.readFileSync(path.join(RAIZ, 'web', 'data', 'efemerides-piezas.json'), 'utf8')),
    async decir(guion, destino, { voz, pieza, bloque, activas }) {
      // En ensayo con clave aparte (_V3) habla con ésa; en real, con GEMINI_API_KEY_REDES, como hoy.
      if (!activas && env.GEMINI_API_KEY_REDES_V3) process.env.GEMINI_API_KEY_REDES = env.GEMINI_API_KEY_REDES_V3;
      try {
        return await decirGemini(paraLeer(guion), destino, { voz: VOCES[voz], indicacion: componerIndicacion(INDICACIONES[bloque]), pieza });
      } catch (e) {
        if (e instanceof SinCupoDeVoz || /cupo del d[ií]a/i.test(String(e?.message))) { const s = new SinCupo(e.message); s.sinCupo = true; throw s; }
        throw e;
      }
    },
    subtitulosEstimados,
    subtitulos: (palabras) => (palabras?.length ? armarAss(enCarteles(palabras, { max: 4, minimo: 2 })) : null),
    async renderizar(pieza, destino, { voz, subtitulos }) {
      const fotosQueNoBajaron = [];
      const lista = await resolverFotos(pieza, { alFallar: (f, e) => fotosQueNoBajaron.push(`${f.url ?? f.ruta}: ${String(e.message).slice(0, 120)}`) });
      const r = await armarVideo(armarEscenaDeVideo(lista), destino, { voz, subtitulos });
      return { ...r, fotosQueNoBajaron };
    },
    // Buffer pide una dirección pública del video: se sube al depósito R2 del render (listos/<huella>/<archivo>.mp4) y lo sirve el Worker de tareas en /video/<huella>/<archivo>.mp4.
    // Un cuadro del video como JPEG (la tapa del reel).
    cuadro: async (mp4, ms) => {
      const { default: ffmpeg } = await import('ffmpeg-static');
      const { spawnSync } = await import('node:child_process');
      const r = spawnSync(ffmpeg, ['-loglevel', 'error', '-ss', String(ms / 1000), '-i', mp4, '-frames:v', '1', '-q:v', '2', '-f', 'image2', '-c:v', 'mjpeg', 'pipe:1'], { maxBuffer: 20 * 1024 * 1024 });
      if (r.status !== 0 || !r.stdout?.length) throw new Error('no se pudo sacar la tapa');
      return r.stdout;
    },
    // Las láminas de un carrusel: se pasan a JPEG (lo único que baja Instagram) y se suben al depósito de placas, que el Worker de redes sirve en /placa/<nombre> (público, lo mismo que las placas de los posteos).
    renderizarCarrusel: async (pieza, carpeta, nombre) => {
      const fotosQueNoBajaron = [];
      const lista = await resolverFotos(pieza, { alFallar: (f, e) => fotosQueNoBajaron.push(`${f.url ?? f.ruta}: ${String(e.message).slice(0, 120)}`) });
      const r = await renderizarPieza(lista, carpeta, { nombre });
      return { archivos: r.archivos, fotosQueNoBajaron };
    },
    subirLamina: async (png, { prefijo }) => {
      const { default: ffmpeg } = await import('ffmpeg-static');
      const { spawnSync } = await import('node:child_process');
      const j = spawnSync(ffmpeg, ['-loglevel', 'error', '-i', png, '-frames:v', '1', '-q:v', '2', '-f', 'image2', '-c:v', 'mjpeg', 'pipe:1'], { maxBuffer: 30 * 1024 * 1024 });
      if (j.status !== 0 || !j.stdout?.length) throw new Error(`no se pudo pasar la lámina a JPEG: ${path.basename(png)}`);
      const nombre = nombreDeLamina(prefijo, j.stdout);
      const r2 = clienteR2({ cuenta: env.CLOUDFLARE_ACCOUNT_ID, bucket: env.R2_RENDER || 'radar-render', accessKey: env.R2_ACCESS_KEY_ID, secretKey: env.R2_SECRET_ACCESS_KEY });
      await r2.guardar(claveR2DePlaca(nombre), j.stdout, 'image/jpeg');
      return `${(env.REDES_URL || DIRECCION_DE_LAS_REDES).replace(/\/$/, '')}/placa/${nombre}`;
    },
    subirVideo: async (archivo, { huella, nombre }) => {
      const r2 = clienteR2({ cuenta: env.CLOUDFLARE_ACCOUNT_ID, bucket: env.R2_RENDER || 'radar-render', accessKey: env.R2_ACCESS_KEY_ID, secretKey: env.R2_SECRET_ACCESS_KEY });
      await r2.guardar(`listos/${huella}/${nombre}`, typeof archivo === 'string' ? fs.readFileSync(archivo) : archivo, 'video/mp4'); // llega el mp4 ya en memoria (o, si no, su ruta)
      return `https://radar-balcarce-tareas.radarbalcarce.workers.dev/video/${encodeURIComponent(huella)}/${encodeURIComponent(nombre)}`;
    },
    // Todo reel de 3.0 habla con voz generada: TikTok lo marca como «contenido con IA» (REGLAS § 10).
    publicarEnBuffer: (o) => publicarReel({ ...o, ia: true }, { env, fetchFn: fetch }),
    clienteMeta: () => crearCliente({ token: env.META_TOKEN, paginaId: env.META_PAGE_ID || PAGINA_DE_FACEBOOK }),
  };
}

const esElPrograma = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (esElPrograma) {
  const carpeta = path.resolve(process.env.SALIDA_PIEZAS || path.join(RAIZ, 'salida-piezas'));
  try {
    const r = await correr({ env: process.env, carpeta, deps: await dependenciasReales(process.env) });
    const malas = r.piezas.filter((p) => p.estado === 'error');
    console.log(`listo: ${r.piezas.length} piezas${malas.length ? `, ${malas.length} con error` : ''}`);
    if (malas.length && malas.length === r.piezas.length) process.exitCode = 1;
  } catch (e) {
    console.error(`piezas: ${e.stack || e}`);
    process.exitCode = 1;
  }
}
